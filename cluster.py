import altair as alt
import argparse
import gzip
import json
import math
import numpy as np
import os
import pandas as pd
import phrasemachine
import secrets
import shutil
import tarfile
import tensorflow_hub as hub
import tensorflow_text
from sentence_transformers import SentenceTransformer

from collections import Counter, defaultdict
from glass.utils import nub, concat, chunks
from hdbscan import HDBSCAN
from ontology import ontology, models, extract
from sklearn.feature_extraction.text import TfidfVectorizer
from tqdm.notebook import tqdm
from umap import UMAP

tqdm.pandas()

# ONTOLOGY_BASE_PATH = ...
ONTOLOGY_TOPICS_FILE = ONTOLOGY_BASE_PATH + "model.latest.json.gz"
ONTOLOGY_SECTORS_FILE = ONTOLOGY_BASE_PATH + "sectors.latest.json.gz"
ONTOLOGY_LOCATIONS_FILE = ONTOLOGY_BASE_PATH + "locations.latest.json.gz"

with gzip.open(ONTOLOGY_TOPICS_FILE) as f:
    tops = models.Topics(json.load(f), save_memory=False)

with gzip.open(ONTOLOGY_SECTORS_FILE) as f:
    secs = models.Sectors(json.load(f))

with gzip.open(ONTOLOGY_LOCATIONS_FILE) as f:
    locs = models.Locations(json.load(f))

ONTOLOGY = ontology.Ontology(tops, secs, locs)
extract.init(ONTOLOGY)

class Error(Exception):
    '''Base class for other exceptions.'''
    pass

class EmbeddingError(Error):
    '''Raised when something goes wrong during embedding text.'''
    pass

class DimensionalityReductionError(Error):
    '''Raised when something goes wrong during dimensionality reduction.'''
    pass

class ClusterError(Error):
    '''Raised when something goes wrong during clustering.'''
    pass

class KeywordExtractionError(Error):
    '''Raised when something goes wrong during keyword extraction.'''
    pass

class ClusterLabellingError(Error):
    '''Raised when something goes wrong during cluster labelling.'''
    pass

class VisualisationError(Error):
    '''Raised when something goes wrong during cluster visualisation.'''
    pass

class SaveError(Error):
    '''Raised when something goes wrong during save down of files.'''
    pass

class Clusterer:

    def __init__(self, uid=None):
        self.CHUNK_SIZE = 500

        if uid:
            self.uid = uid
        else:
            self.uid = secrets.token_hex(4)

    def _embed_tsdae(self, text_array):
        '''
        Embed an array of strings into universal sentence encoder embedding vectors.
        Note: Embeds in chunks of size self.CHUNK_SIZE.

        Args:
            - text_array: an array of strings to embed

        Returns:
            Numpy array containing stacked embeddings.
        '''
        # TSDAE_MODEL_PATH = ...
        model = SentenceTransformer(TSDAE_MODEL_PATH)
        pbar = tqdm(total=math.ceil(len(text_array) / self.CHUNK_SIZE))
        embeddings = []

        for chunk in chunks(text_array, self.CHUNK_SIZE):
            embeddings.append(model.encode(chunk))
            pbar.update(1)

        embeddings = np.vstack(embeddings)
        return embeddings

    def _embed_use(self, text_array):
        '''
        Embed an array of strings into universal sentence encoder embedding vectors.
        Note: Embeds in chunks of size self.CHUNK_SIZE.

        Args:
            - text_array: an array of strings to embed

        Returns:
            Numpy array containing stacked embeddings.
        '''

        embed = hub.load("https://tfhub.dev/google/universal-sentence-encoder/4")
        pbar = tqdm(total=math.ceil(len(text_array) / self.CHUNK_SIZE))
        embeddings = []

        for chunk in chunks(text_array, self.CHUNK_SIZE):
            embeddings.append(embed(chunk))
            pbar.update(1)

        embeddings = np.vstack(embeddings)
        return embeddings

    def _embed_tfidf(self, text_array):
        '''
        Embed an array of strings into tf-idf sparse matrix.

        Args:
            - text_array: an array of strings to embed

        Returns:
            Tfidf embedding of vectors in a sparse matrix.
        '''
        tfidf_vectorizer = TfidfVectorizer(min_df=3, stop_words='english')
        return tfidf_vectorizer.fit_transform(text_array)

    def embed(self, text_array, method):
        '''
        Embeds an array of strings using a specified method.

        Args:
            - text_array: an array of strings to embed
            - method: method of embedding (use / tfidf)

        Returns:
            Matrix representing stack of computed embeddings of specified type.
        '''
        embed_func = {'use': self._embed_use,
                      'tfidf': self._embed_tfidf,
                      'tsdae': self._embed_tsdae}[method]
        return embed_func(text_array)

    def reduce_dimensions(self, embeddings, method):
        '''
        Reduces dimensions of embeddings using a specified method.

        Args:
            - embeddings: matrix of stacked text embeddings
            - method: method of dimensionality reduction (cosine / hellinger)

        Returns:
            Numpy array containing 2D representation of embeddings.
        '''
        umap_embeddings = UMAP(n_neighbors=5, min_dist=0., metric=method).fit_transform(embeddings)
        return umap_embeddings

    def cluster(self, X, cluster_size=10, samples=5):
        '''
        Clusters a numpy array of 2D points using hdbscan.

        Args:
            - X: numpy array of 2d points
            - cluster_size: minimum size of a cluster for hdbscan to find
            - samples: min_samples parameter for hdbscan

        Returns:
            Labels denoting cluster assignment for each input point.
        '''
        hdbscan = HDBSCAN(min_cluster_size=cluster_size, min_samples=samples, cluster_selection_method='leaf')
        clusters = hdbscan.fit(X).labels_

        return clusters

    def _extract_keywords_phrasemachine(self, text):
        '''
        Extract keywords from text using phrasemachine.

        Args:
            - text: text to extract keywords from

        Returns:
            List of keywords found in text.
        '''
        return [kw for kw in phrasemachine.get_phrases(text)['counts'].keys() if len(kw.split()) <= 3]

    def _extract_keywords_ontology(self, text):
        '''
        Extract keywords from text using glass.ai ontology extract function.

        Args:
            - text: text to extract keywords from

        Returns:
            List of keywords found in text.
        '''
        keywords = set()
        for sent in text.split('. '):
            keywords.update([topic.topic_name for topic in extract.extract(sent)])

        return list(keywords)

    def extract_keywords(self, text_array, method):
        '''
        Extract keywords from an array of strings using a specified method.
        '''
        extract_func = {'phrasemachine':self._extract_keywords_phrasemachine,
                        'ontology':self._extract_keywords_ontology}[method]
        keywords = [extract_func(text) for text in tqdm(text_array)]

        return keywords

    def label_clusters(self, df):
        '''
        Labels clusters based on tfidf score of keywords from cluster.

        Args:
            - df: dataframe containing keywords / cluster values

        Returns:
            Dataframe containing clusters, keywords and labels, where labels are keyword with highest tfidf score.
        '''
        tf = defaultdict(Counter)
        idf = Counter()
        tfidf = defaultdict(Counter)

        # get term frequency for each cluster (document)
        for key, rows in tqdm(df.groupby('cluster')):
            for topic_list in list(rows.phrases):
                tf[key].update(topic_list)

        # get list of unique keywords, unique clusters and number of clusters
        kws = nub(concat([list(d.keys()) for d in tf.values()]))
        cluster_ids = df.sort_values('cluster').cluster.unique()
        N = len(cluster_ids)

        # get inverse document (cluster) frequency per keyword
        for kw in tqdm(kws):
            freq = sum(kw in d for d in tf.values())
            idf[kw] = math.log10((1+N)/(1+freq))

        # calculate tf-idf for each cluster for each keyword in cluster
        for c in tqdm(cluster_ids):
            tfidf[c][''] = -1
            for p in tf[c].keys():
                tfidf[c][p] = tf[c][p] * idf[p]

        # form a dataframe out of these clusters
        cluster_keywords = {k:[p for p, _ in v.most_common()] for k, v in tfidf.items()}

        clusters = pd.DataFrame(list(cluster_keywords.items()), columns=['cluster', 'keywords'])
        clusters["label"] = clusters.keywords.map(lambda xs: xs[0] if len(xs) > 0 else "")

        clusters = self._compute_centroids(df, clusters)

        return clusters

    def _geometric_median(self, X):
        '''
        Finds the point in an n-dimensional numpy array with the smallest distance to all other points.
        Note: Misleading name, this is an in-set cheats geo-median for visualing cluster labels.

        Args:
            - X: numpy array of n-dimensional points

        Returns:
            n-dimensional point from input array with smallest summed distance to all other points.
        '''
        dists = [np.sum(np.linalg.norm(X - x, axis=1)) for x in X]
        return X[np.argmin(dists)]

    def _compute_centroids(self, df, clusters):
        '''
        Computes centroids (geometric median) of clustered points.

        Args:
            - df: copy of input dataframe containing all columns with x, y values
            - clusters: dataframe containing clusters, keywords and labels

        Returns:
            clusters dataframe with cluster centroids merged in.
        '''
        centroids = []

        for cluster, rows in df.groupby('cluster'):
            x, y = self._geometric_median(rows[['x', 'y']].values)
            centroids.append({'cluster':cluster, 'x':x, 'y':y})

        centroids = pd.DataFrame(centroids)
        clusters = pd.merge(clusters, centroids, on='cluster', how='left')

        return clusters

    def save(self, df, clusters):
        '''
        Makes an archive containing the data file, cluster file and visualisation.

        Args:
            - df: dataframe containing rows with assigned clusters
            - clusters: dataframe containing clusters with labels
            - visualisation: altair visualisation of clusters and labels

        Returns:
            No function returns but saves tar archive containing previously specified files.
        '''
        # make temp folder
        if not os.path.exists(f"/tmp/{self.uid}"):
            os.makedirs(f"/tmp/{self.uid}")

        # save data file, cluster file and html visualisation to temp folder
        df.to_csv(f"/tmp/{self.uid}/{self.uid}.data.tsv", index=None, sep='\t')
        clusters.to_csv(f"/tmp/{self.uid}/{self.uid}.clusters.tsv", index=None, sep='\t')

        # tar files
        with tarfile.open(f"{self.uid}.tgz", "w:gz") as tar:
            tar.add(f"/tmp/{self.uid}", arcname=os.path.basename(f"/tmp/{self.uid}"))

        # get rid of temp folder
        if os.path.exists(f"/tmp/{self.uid}"):
            shutil.rmtree(f"/tmp/{self.uid}")

    def save_cluster_explorer_format(self, df, clusters):
        if 'label' not in list(df):
            df['label'] = np.nan

        out_dir = f"client/static/data/{self.uid}"

        if not os.path.exists(out_dir):
            os.makedirs(out_dir)

        df.drop(columns=['phrases']).to_csv(f"{out_dir}/scatter.csv", index=None)
        clusters[['label', 'x', 'y']].to_csv(f"{out_dir}/labels.csv", index=None)

    def cluster_text(self, df,
                           embedding_method='use',
                           keyword_method='ontology',
                           precomputed_phrases=None,
                           cluster_size=10):
        '''
        Cluster text and make an archive containing data tsv file with orgs (rows) and cluster assignment, a cluster tsv file
        with cluster descriptions, and a html visualisation of the clusters.

        Args:
            - df: the dataframe to work with
            - text_column: the column in the dataframe containing the text to cluster on
            - review_column: column containing nan / 0 / 1 values representing none / bad / good reviews (will result in these being visualised as red / green crosses)
            - embedding_method: either 'use' or 'tfidf', the method used to embed the text
            - keyword_method: either 'ontology' or 'phrasemachine', the method used to extract keywords from the text
            - precomputed_phrases: name of a dataframe column containing keywords to use, if this is given will ignore keyword_method and use these instead
            - cluster_size: minimum size of clusters to find
            - colour_by: column name of value to colour the scatter visualisation by, if this isn't given colours will instead be determined by cluster
            - tooltip: list of column names whose values will be included on a tooltip when the user hovers over a point on the visualisation
            - show_unclustered: if true includes in visualisation points that hdbscan was unable to cluster

        Returns:
            No function returns but will make an archive with title of uid specified when class created containing the data file, cluster file and visualisation.
        '''
        df = df[df.description.notnull()].reset_index(drop=True).copy()

        # grab text
        text = df.description.values

        # embed text
        try:
            print('Embedding text.')
            embeddings = self.embed(text, embedding_method)

        except Exception as e:
            raise EmbeddingError('Failed to compute text embeddings.') from e

        # reduce dimensions with umap
        try:
            print('Reducing embedding dimensions.')
            method = {'use':'cosine', 'tfidf':'hellinger', 'tsdae':'cosine'}[embedding_method]
            umap_embeddings = self.reduce_dimensions(embeddings, method)

            df['x'] = umap_embeddings[:, 0]
            df['y'] = umap_embeddings[:, 1]

        except Exception as e:
            raise DimensionalityReductionError('Failed to reduce dimensions of embeddings.') from e

        # drop any rows where embedding / dimensionality reduction has failed
        df.replace([np.inf, -np.inf], np.nan, inplace=True)
        df = df.dropna(subset=['x', 'y'])

        # cluster on embeddings
        try:
            print('Clustering embeddings.')
            X = df[['x', 'y']].values
            df['cluster'] = self.cluster(X, cluster_size=cluster_size)

        except Exception as e:
            raise ClusterError('Failed to cluster low dimension text embeddings.') from e

        # extract phrases
        try:
            print('Extracting keywords from text.')
            if precomputed_phrases:
                df['phrases'] = df[precomputed_phrases]
            else:
                df['phrases'] = self.extract_keywords(df.description.values, keyword_method)

        except Exception as e:
            raise KeywordExtractionError('Failed to extract keywords from text.') from e

        # label each cluster with a phrase
        try:
            print('Labelling clusters.')
            clusters = self.label_clusters(df)

        except Exception as e:
            raise ClusterLabellingError('Failed to label clusters with key words / phrases.') from e

        # save and archive files
        try:
            print('Saving files.')
            self.save(df, clusters)

        except Exception as e:
            raise SaveError('Failed to save files.') from e

        # save files for cluster explorer
        try:
            print('Saving files in cluster explorer format.')
            self.save_cluster_explorer_format(df, clusters)

        except Exception as e:
            raise SaveError('Failed to save files in cluster explorer format.') from e
