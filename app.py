import os
import re
import uuid
import time
import string
import random
import tarfile
import logging
import os.path
import paramiko
import traceback
import pandas as pd
from queue import Queue
from scp import SCPClient
from threading import Thread
from glass.david import DavidGlass

from cluster import Clusterer
from flask import Flask, send_from_directory, render_template, url_for, request

def generate_token():
    return ''.join(random.choices(string.digits + string.ascii_lowercase + string.ascii_uppercase, k=20))

def send_to_storage(file_name):
    # SCP_HOST = ...
    # SCP_USERNAME = ...
    # SCP_PATH = ...

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(SCP_HOST, username=SCP_USERNAME, key_filename=SCP_PATH)

    with SCPClient(ssh.get_transport()) as scp:
        scp.put(file_name, 'modelservice')

    if os.path.isfile(file_name):
        os.remove(file_name)

def open_file(file_path):
    file_extension = file_path.split('.')[-1]

    if file_extension == 'csv':
        df = pd.read_csv(file_path)

    elif file_extension == 'tsv':
        df = pd.read_table(file_path)

    elif file_extension == 'xlsx':
        df = pd.read_excel(file_path)

    else:
        return None

    return df

def check_file(request, file_name):
    # file with name not found
    if file_name not in request.files:
        return "No input file provided.\n", 400

    # save file in tmp
    file = request.files[file_name]
    file_path = os.path.join("/tmp", file.filename)
    file.save(file_path)

    try:
        # check that file can be opened
        df = open_file(file_path)
        print(list(df))
        if df is None:
            return "Wrong file extension, please input a (csv|tsv|xlsx) file.\n", 400

    except ValueError as e:
        return "Something went wrong when reading the contents of the file. Check format and try again.\n", 400

    except:
        return "Something went wrong reading the input file. Please try again.\n", 400

    return file_path, 200

class ClusterWorker(Thread):
    def __init__(self):
        super().__init__()

        self.job_queue = Queue()

        with self.job_queue.mutex:
            self.job_queue.queue.clear()

        self.slack_ids = dict(pd.read_csv('slack_id.csv').values.tolist())
        self.davids = dict()

    def resolve_slack_id(self, params):
        # check if a user arg has been explicitly specified
        if 'user' in params and params.get('user', '') in self.slack_ids:
            return self.slack_ids[params['user']]

        # else attempt to infer from ip address
        elif 'ip' in params and params.get('ip', '') in self.slack_ids:
            return self.slack_ids[params['ip']]

        else:
            return ''

    def get_david(self, params):
        # resolve the slack id from parameters dict
        slack_id = self.resolve_slack_id(params)

        # if david exists, return it, else instantiate and key
        if slack_id in self.davids:
            return self.davids[slack_id]
        else:
            self.davids[slack_id] = DavidGlass(slack_id)
            return self.davids[slack_id]

    def cluster(self, params):
        print('starting.')

        # load in slack bot
        david = self.get_david(params)
        david.new_message('Started clustering.')

        try:
            print(params)

            # load file and get relevant parameters
            input_df = open_file(params['input_filepath'])
            embedding_method = params['embedding_method']
            keyword_method = params['keyword_method']
            cluster_size = params['cluster_size']

            if ('text_column' in params) and params.get('text_column', ''):
                input_df = input_df.rename(columns={params['text_column']:'description'})

        except Exception as e:
            tb = traceback.format_exc()
            david.new_message('Something went wrong:')
            david.new_message(f"```{tb}```")
            return

        try:
            # normalise whitespace in input df
            str_cols = [col for col in list(input_df) if (isinstance(input_df[col].dropna().values.tolist()[0], str) if input_df[col].dropna().values.tolist() else False)]

            for col in str_cols:
                input_df.loc[input_df[col].notnull(), col] = input_df.loc[input_df[col].notnull(), col].map(lambda x: re.sub('\s+', ' ', x))

        except Exception:
            tb = traceback.format_exc()
            david.new_message('Something went wrong:')
            david.new_message(f"```{tb}```")
            return

        try:
            clusterer = Clusterer(params['id'])
            clusterer.cluster_text(input_df,
                                   embedding_method=embedding_method,
                                   keyword_method=keyword_method,
                                   cluster_size=cluster_size)

            send_to_storage(f"{params['id']}.tgz")
            david.new_message(f"Finished clustering. Results are available on the storage box at `modelservice/{params['id']}.tgz` and visualisation is available at http://{HOST}:{PORT}/scatter/{params['id']}")

        except Exception:
            tb = traceback.format_exc()
            david.new_message('Something went wrong:')
            david.new_message(f"```{tb}```")
            return

    def run(self):
        while True:
            time.sleep(5)

            try:
                task, params = self.job_queue.get()
                self.cluster(params)

            except:
                pass

app = Flask(__name__, template_folder='client/templates')

@app.route('/cluster', methods=['POST'])
def cluster_service():
    # load input file
    resp, status = check_file(request, 'input')
    if status != 200:
        return resp, status
    else:
        input_filepath = resp

    # load arguments
    params = {
        'id': generate_token(),
        'ip': request.remote_addr,
        'user': request.args.get('user'),
        'input_filepath': input_filepath,
        'embedding_method': request.args.get('embedding_method', default='use'),
        'keyword_method': request.args.get('keyword_method', default='ontology'),
        'cluster_size': request.args.get('cluster_size', default=10, type=int),
        'text_column': request.args.get('text_column')
    }

    david = cluster_worker.get_david(params)
    david.new_message(f"Clustering job submitted successfully.")

    # add task to queue
    cluster_worker.job_queue.put(('cluster', params))

    return "Submitted task successfully.\n", 200

# Path for our main Svelte page
@app.route('/scatter/<token>', methods=['GET'])
def scatter(token):
    return render_template('index.html', token=token)

# Path for all the static files (compiled JS/CSS, etc.)
@app.route("/<path:path>")
def home(path):
    print(path);
    return send_from_directory('.', path)

@app.route('/favicon.ico')
def favicon():
    return send_from_directory('client/static', 'favicon.ico', mimetype='image/vnd.microsoft.icon')

if __name__ == "__main__":
    cluster_worker = ClusterWorker()
    cluster_worker.start()

    #HOST = ...
    #PORT = ...
    app.run(host=HOST, port=PORT, debug=True)
