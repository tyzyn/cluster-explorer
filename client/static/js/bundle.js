
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35730/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function subscribe(store, callback) {
        const unsub = store.subscribe(callback);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function set_store_value(store, ret, value = ret) {
        store.set(value);
        return ret;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.data !== data)
            text.data = data;
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
                return ret;
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var papaparse_min = createCommonjsModule(function (module, exports) {
    /* @license
    Papa Parse
    v5.3.2
    https://github.com/mholt/PapaParse
    License: MIT
    */
    !function(e,t){module.exports=t();}(commonjsGlobal,function s(){var f="undefined"!=typeof self?self:"undefined"!=typeof window?window:void 0!==f?f:{};var n=!f.document&&!!f.postMessage,o=n&&/blob:/i.test((f.location||{}).protocol),a={},h=0,b={parse:function(e,t){var i=(t=t||{}).dynamicTyping||!1;M(i)&&(t.dynamicTypingFunction=i,i={});if(t.dynamicTyping=i,t.transform=!!M(t.transform)&&t.transform,t.worker&&b.WORKERS_SUPPORTED){var r=function(){if(!b.WORKERS_SUPPORTED)return !1;var e=(i=f.URL||f.webkitURL||null,r=s.toString(),b.BLOB_URL||(b.BLOB_URL=i.createObjectURL(new Blob(["(",r,")();"],{type:"text/javascript"})))),t=new f.Worker(e);var i,r;return t.onmessage=_,t.id=h++,a[t.id]=t}();return r.userStep=t.step,r.userChunk=t.chunk,r.userComplete=t.complete,r.userError=t.error,t.step=M(t.step),t.chunk=M(t.chunk),t.complete=M(t.complete),t.error=M(t.error),delete t.worker,void r.postMessage({input:e,config:t,workerId:r.id})}var n=null;"string"==typeof e?n=t.download?new l(t):new p(t):!0===e.readable&&M(e.read)&&M(e.on)?n=new g(t):(f.File&&e instanceof File||e instanceof Object)&&(n=new c(t));return n.stream(e)},unparse:function(e,t){var n=!1,_=!0,m=",",y="\r\n",s='"',a=s+s,i=!1,r=null,o=!1;!function(){if("object"!=typeof t)return;"string"!=typeof t.delimiter||b.BAD_DELIMITERS.filter(function(e){return -1!==t.delimiter.indexOf(e)}).length||(m=t.delimiter);("boolean"==typeof t.quotes||"function"==typeof t.quotes||Array.isArray(t.quotes))&&(n=t.quotes);"boolean"!=typeof t.skipEmptyLines&&"string"!=typeof t.skipEmptyLines||(i=t.skipEmptyLines);"string"==typeof t.newline&&(y=t.newline);"string"==typeof t.quoteChar&&(s=t.quoteChar);"boolean"==typeof t.header&&(_=t.header);if(Array.isArray(t.columns)){if(0===t.columns.length)throw new Error("Option columns is empty");r=t.columns;}void 0!==t.escapeChar&&(a=t.escapeChar+s);("boolean"==typeof t.escapeFormulae||t.escapeFormulae instanceof RegExp)&&(o=t.escapeFormulae instanceof RegExp?t.escapeFormulae:/^[=+\-@\t\r].*$/);}();var h=new RegExp(j(s),"g");"string"==typeof e&&(e=JSON.parse(e));if(Array.isArray(e)){if(!e.length||Array.isArray(e[0]))return u(null,e,i);if("object"==typeof e[0])return u(r||Object.keys(e[0]),e,i)}else if("object"==typeof e)return "string"==typeof e.data&&(e.data=JSON.parse(e.data)),Array.isArray(e.data)&&(e.fields||(e.fields=e.meta&&e.meta.fields||r),e.fields||(e.fields=Array.isArray(e.data[0])?e.fields:"object"==typeof e.data[0]?Object.keys(e.data[0]):[]),Array.isArray(e.data[0])||"object"==typeof e.data[0]||(e.data=[e.data])),u(e.fields||[],e.data||[],i);throw new Error("Unable to serialize unrecognized input");function u(e,t,i){var r="";"string"==typeof e&&(e=JSON.parse(e)),"string"==typeof t&&(t=JSON.parse(t));var n=Array.isArray(e)&&0<e.length,s=!Array.isArray(t[0]);if(n&&_){for(var a=0;a<e.length;a++)0<a&&(r+=m),r+=v(e[a],a);0<t.length&&(r+=y);}for(var o=0;o<t.length;o++){var h=n?e.length:t[o].length,u=!1,f=n?0===Object.keys(t[o]).length:0===t[o].length;if(i&&!n&&(u="greedy"===i?""===t[o].join("").trim():1===t[o].length&&0===t[o][0].length),"greedy"===i&&n){for(var d=[],l=0;l<h;l++){var c=s?e[l]:l;d.push(t[o][c]);}u=""===d.join("").trim();}if(!u){for(var p=0;p<h;p++){0<p&&!f&&(r+=m);var g=n&&s?e[p]:p;r+=v(t[o][g],p);}o<t.length-1&&(!i||0<h&&!f)&&(r+=y);}}return r}function v(e,t){if(null==e)return "";if(e.constructor===Date)return JSON.stringify(e).slice(1,25);var i=!1;o&&"string"==typeof e&&o.test(e)&&(e="'"+e,i=!0);var r=e.toString().replace(h,a);return (i=i||!0===n||"function"==typeof n&&n(e,t)||Array.isArray(n)&&n[t]||function(e,t){for(var i=0;i<t.length;i++)if(-1<e.indexOf(t[i]))return !0;return !1}(r,b.BAD_DELIMITERS)||-1<r.indexOf(m)||" "===r.charAt(0)||" "===r.charAt(r.length-1))?s+r+s:r}}};if(b.RECORD_SEP=String.fromCharCode(30),b.UNIT_SEP=String.fromCharCode(31),b.BYTE_ORDER_MARK="\ufeff",b.BAD_DELIMITERS=["\r","\n",'"',b.BYTE_ORDER_MARK],b.WORKERS_SUPPORTED=!n&&!!f.Worker,b.NODE_STREAM_INPUT=1,b.LocalChunkSize=10485760,b.RemoteChunkSize=5242880,b.DefaultDelimiter=",",b.Parser=E,b.ParserHandle=i,b.NetworkStreamer=l,b.FileStreamer=c,b.StringStreamer=p,b.ReadableStreamStreamer=g,f.jQuery){var d=f.jQuery;d.fn.parse=function(o){var i=o.config||{},h=[];return this.each(function(e){if(!("INPUT"===d(this).prop("tagName").toUpperCase()&&"file"===d(this).attr("type").toLowerCase()&&f.FileReader)||!this.files||0===this.files.length)return !0;for(var t=0;t<this.files.length;t++)h.push({file:this.files[t],inputElem:this,instanceConfig:d.extend({},i)});}),e(),this;function e(){if(0!==h.length){var e,t,i,r,n=h[0];if(M(o.before)){var s=o.before(n.file,n.inputElem);if("object"==typeof s){if("abort"===s.action)return e="AbortError",t=n.file,i=n.inputElem,r=s.reason,void(M(o.error)&&o.error({name:e},t,i,r));if("skip"===s.action)return void u();"object"==typeof s.config&&(n.instanceConfig=d.extend(n.instanceConfig,s.config));}else if("skip"===s)return void u()}var a=n.instanceConfig.complete;n.instanceConfig.complete=function(e){M(a)&&a(e,n.file,n.inputElem),u();},b.parse(n.file,n.instanceConfig);}else M(o.complete)&&o.complete();}function u(){h.splice(0,1),e();}};}function u(e){this._handle=null,this._finished=!1,this._completed=!1,this._halted=!1,this._input=null,this._baseIndex=0,this._partialLine="",this._rowCount=0,this._start=0,this._nextChunk=null,this.isFirstChunk=!0,this._completeResults={data:[],errors:[],meta:{}},function(e){var t=w(e);t.chunkSize=parseInt(t.chunkSize),e.step||e.chunk||(t.chunkSize=null);this._handle=new i(t),(this._handle.streamer=this)._config=t;}.call(this,e),this.parseChunk=function(e,t){if(this.isFirstChunk&&M(this._config.beforeFirstChunk)){var i=this._config.beforeFirstChunk(e);void 0!==i&&(e=i);}this.isFirstChunk=!1,this._halted=!1;var r=this._partialLine+e;this._partialLine="";var n=this._handle.parse(r,this._baseIndex,!this._finished);if(!this._handle.paused()&&!this._handle.aborted()){var s=n.meta.cursor;this._finished||(this._partialLine=r.substring(s-this._baseIndex),this._baseIndex=s),n&&n.data&&(this._rowCount+=n.data.length);var a=this._finished||this._config.preview&&this._rowCount>=this._config.preview;if(o)f.postMessage({results:n,workerId:b.WORKER_ID,finished:a});else if(M(this._config.chunk)&&!t){if(this._config.chunk(n,this._handle),this._handle.paused()||this._handle.aborted())return void(this._halted=!0);n=void 0,this._completeResults=void 0;}return this._config.step||this._config.chunk||(this._completeResults.data=this._completeResults.data.concat(n.data),this._completeResults.errors=this._completeResults.errors.concat(n.errors),this._completeResults.meta=n.meta),this._completed||!a||!M(this._config.complete)||n&&n.meta.aborted||(this._config.complete(this._completeResults,this._input),this._completed=!0),a||n&&n.meta.paused||this._nextChunk(),n}this._halted=!0;},this._sendError=function(e){M(this._config.error)?this._config.error(e):o&&this._config.error&&f.postMessage({workerId:b.WORKER_ID,error:e,finished:!1});};}function l(e){var r;(e=e||{}).chunkSize||(e.chunkSize=b.RemoteChunkSize),u.call(this,e),this._nextChunk=n?function(){this._readChunk(),this._chunkLoaded();}:function(){this._readChunk();},this.stream=function(e){this._input=e,this._nextChunk();},this._readChunk=function(){if(this._finished)this._chunkLoaded();else{if(r=new XMLHttpRequest,this._config.withCredentials&&(r.withCredentials=this._config.withCredentials),n||(r.onload=v(this._chunkLoaded,this),r.onerror=v(this._chunkError,this)),r.open(this._config.downloadRequestBody?"POST":"GET",this._input,!n),this._config.downloadRequestHeaders){var e=this._config.downloadRequestHeaders;for(var t in e)r.setRequestHeader(t,e[t]);}if(this._config.chunkSize){var i=this._start+this._config.chunkSize-1;r.setRequestHeader("Range","bytes="+this._start+"-"+i);}try{r.send(this._config.downloadRequestBody);}catch(e){this._chunkError(e.message);}n&&0===r.status&&this._chunkError();}},this._chunkLoaded=function(){4===r.readyState&&(r.status<200||400<=r.status?this._chunkError():(this._start+=this._config.chunkSize?this._config.chunkSize:r.responseText.length,this._finished=!this._config.chunkSize||this._start>=function(e){var t=e.getResponseHeader("Content-Range");if(null===t)return -1;return parseInt(t.substring(t.lastIndexOf("/")+1))}(r),this.parseChunk(r.responseText)));},this._chunkError=function(e){var t=r.statusText||e;this._sendError(new Error(t));};}function c(e){var r,n;(e=e||{}).chunkSize||(e.chunkSize=b.LocalChunkSize),u.call(this,e);var s="undefined"!=typeof FileReader;this.stream=function(e){this._input=e,n=e.slice||e.webkitSlice||e.mozSlice,s?((r=new FileReader).onload=v(this._chunkLoaded,this),r.onerror=v(this._chunkError,this)):r=new FileReaderSync,this._nextChunk();},this._nextChunk=function(){this._finished||this._config.preview&&!(this._rowCount<this._config.preview)||this._readChunk();},this._readChunk=function(){var e=this._input;if(this._config.chunkSize){var t=Math.min(this._start+this._config.chunkSize,this._input.size);e=n.call(e,this._start,t);}var i=r.readAsText(e,this._config.encoding);s||this._chunkLoaded({target:{result:i}});},this._chunkLoaded=function(e){this._start+=this._config.chunkSize,this._finished=!this._config.chunkSize||this._start>=this._input.size,this.parseChunk(e.target.result);},this._chunkError=function(){this._sendError(r.error);};}function p(e){var i;u.call(this,e=e||{}),this.stream=function(e){return i=e,this._nextChunk()},this._nextChunk=function(){if(!this._finished){var e,t=this._config.chunkSize;return t?(e=i.substring(0,t),i=i.substring(t)):(e=i,i=""),this._finished=!i,this.parseChunk(e)}};}function g(e){u.call(this,e=e||{});var t=[],i=!0,r=!1;this.pause=function(){u.prototype.pause.apply(this,arguments),this._input.pause();},this.resume=function(){u.prototype.resume.apply(this,arguments),this._input.resume();},this.stream=function(e){this._input=e,this._input.on("data",this._streamData),this._input.on("end",this._streamEnd),this._input.on("error",this._streamError);},this._checkIsFinished=function(){r&&1===t.length&&(this._finished=!0);},this._nextChunk=function(){this._checkIsFinished(),t.length?this.parseChunk(t.shift()):i=!0;},this._streamData=v(function(e){try{t.push("string"==typeof e?e:e.toString(this._config.encoding)),i&&(i=!1,this._checkIsFinished(),this.parseChunk(t.shift()));}catch(e){this._streamError(e);}},this),this._streamError=v(function(e){this._streamCleanUp(),this._sendError(e);},this),this._streamEnd=v(function(){this._streamCleanUp(),r=!0,this._streamData("");},this),this._streamCleanUp=v(function(){this._input.removeListener("data",this._streamData),this._input.removeListener("end",this._streamEnd),this._input.removeListener("error",this._streamError);},this);}function i(m){var a,o,h,r=Math.pow(2,53),n=-r,s=/^\s*-?(\d+\.?|\.\d+|\d+\.\d+)([eE][-+]?\d+)?\s*$/,u=/^(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))$/,t=this,i=0,f=0,d=!1,e=!1,l=[],c={data:[],errors:[],meta:{}};if(M(m.step)){var p=m.step;m.step=function(e){if(c=e,_())g();else{if(g(),0===c.data.length)return;i+=e.data.length,m.preview&&i>m.preview?o.abort():(c.data=c.data[0],p(c,t));}};}function y(e){return "greedy"===m.skipEmptyLines?""===e.join("").trim():1===e.length&&0===e[0].length}function g(){return c&&h&&(k("Delimiter","UndetectableDelimiter","Unable to auto-detect delimiting character; defaulted to '"+b.DefaultDelimiter+"'"),h=!1),m.skipEmptyLines&&(c.data=c.data.filter(function(e){return !y(e)})),_()&&function(){if(!c)return;function e(e,t){M(m.transformHeader)&&(e=m.transformHeader(e,t)),l.push(e);}if(Array.isArray(c.data[0])){for(var t=0;_()&&t<c.data.length;t++)c.data[t].forEach(e);c.data.splice(0,1);}else c.data.forEach(e);}(),function(){if(!c||!m.header&&!m.dynamicTyping&&!m.transform)return c;function e(e,t){var i,r=m.header?{}:[];for(i=0;i<e.length;i++){var n=i,s=e[i];m.header&&(n=i>=l.length?"__parsed_extra":l[i]),m.transform&&(s=m.transform(s,n)),s=v(n,s),"__parsed_extra"===n?(r[n]=r[n]||[],r[n].push(s)):r[n]=s;}return m.header&&(i>l.length?k("FieldMismatch","TooManyFields","Too many fields: expected "+l.length+" fields but parsed "+i,f+t):i<l.length&&k("FieldMismatch","TooFewFields","Too few fields: expected "+l.length+" fields but parsed "+i,f+t)),r}var t=1;!c.data.length||Array.isArray(c.data[0])?(c.data=c.data.map(e),t=c.data.length):c.data=e(c.data,0);m.header&&c.meta&&(c.meta.fields=l);return f+=t,c}()}function _(){return m.header&&0===l.length}function v(e,t){return i=e,m.dynamicTypingFunction&&void 0===m.dynamicTyping[i]&&(m.dynamicTyping[i]=m.dynamicTypingFunction(i)),!0===(m.dynamicTyping[i]||m.dynamicTyping)?"true"===t||"TRUE"===t||"false"!==t&&"FALSE"!==t&&(function(e){if(s.test(e)){var t=parseFloat(e);if(n<t&&t<r)return !0}return !1}(t)?parseFloat(t):u.test(t)?new Date(t):""===t?null:t):t;var i;}function k(e,t,i,r){var n={type:e,code:t,message:i};void 0!==r&&(n.row=r),c.errors.push(n);}this.parse=function(e,t,i){var r=m.quoteChar||'"';if(m.newline||(m.newline=function(e,t){e=e.substring(0,1048576);var i=new RegExp(j(t)+"([^]*?)"+j(t),"gm"),r=(e=e.replace(i,"")).split("\r"),n=e.split("\n"),s=1<n.length&&n[0].length<r[0].length;if(1===r.length||s)return "\n";for(var a=0,o=0;o<r.length;o++)"\n"===r[o][0]&&a++;return a>=r.length/2?"\r\n":"\r"}(e,r)),h=!1,m.delimiter)M(m.delimiter)&&(m.delimiter=m.delimiter(e),c.meta.delimiter=m.delimiter);else{var n=function(e,t,i,r,n){var s,a,o,h;n=n||[",","\t","|",";",b.RECORD_SEP,b.UNIT_SEP];for(var u=0;u<n.length;u++){var f=n[u],d=0,l=0,c=0;o=void 0;for(var p=new E({comments:r,delimiter:f,newline:t,preview:10}).parse(e),g=0;g<p.data.length;g++)if(i&&y(p.data[g]))c++;else{var _=p.data[g].length;l+=_,void 0!==o?0<_&&(d+=Math.abs(_-o),o=_):o=_;}0<p.data.length&&(l/=p.data.length-c),(void 0===a||d<=a)&&(void 0===h||h<l)&&1.99<l&&(a=d,s=f,h=l);}return {successful:!!(m.delimiter=s),bestDelimiter:s}}(e,m.newline,m.skipEmptyLines,m.comments,m.delimitersToGuess);n.successful?m.delimiter=n.bestDelimiter:(h=!0,m.delimiter=b.DefaultDelimiter),c.meta.delimiter=m.delimiter;}var s=w(m);return m.preview&&m.header&&s.preview++,a=e,o=new E(s),c=o.parse(a,t,i),g(),d?{meta:{paused:!0}}:c||{meta:{paused:!1}}},this.paused=function(){return d},this.pause=function(){d=!0,o.abort(),a=M(m.chunk)?"":a.substring(o.getCharIndex());},this.resume=function(){t.streamer._halted?(d=!1,t.streamer.parseChunk(a,!0)):setTimeout(t.resume,3);},this.aborted=function(){return e},this.abort=function(){e=!0,o.abort(),c.meta.aborted=!0,M(m.complete)&&m.complete(c),a="";};}function j(e){return e.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}function E(e){var S,O=(e=e||{}).delimiter,x=e.newline,I=e.comments,T=e.step,D=e.preview,A=e.fastMode,L=S=void 0===e.quoteChar||null===e.quoteChar?'"':e.quoteChar;if(void 0!==e.escapeChar&&(L=e.escapeChar),("string"!=typeof O||-1<b.BAD_DELIMITERS.indexOf(O))&&(O=","),I===O)throw new Error("Comment character same as delimiter");!0===I?I="#":("string"!=typeof I||-1<b.BAD_DELIMITERS.indexOf(I))&&(I=!1),"\n"!==x&&"\r"!==x&&"\r\n"!==x&&(x="\n");var F=0,z=!1;this.parse=function(r,t,i){if("string"!=typeof r)throw new Error("Input must be a string");var n=r.length,e=O.length,s=x.length,a=I.length,o=M(T),h=[],u=[],f=[],d=F=0;if(!r)return C();if(A||!1!==A&&-1===r.indexOf(S)){for(var l=r.split(x),c=0;c<l.length;c++){if(f=l[c],F+=f.length,c!==l.length-1)F+=x.length;else if(i)return C();if(!I||f.substring(0,a)!==I){if(o){if(h=[],k(f.split(O)),R(),z)return C()}else k(f.split(O));if(D&&D<=c)return h=h.slice(0,D),C(!0)}}return C()}for(var p=r.indexOf(O,F),g=r.indexOf(x,F),_=new RegExp(j(L)+j(S),"g"),m=r.indexOf(S,F);;)if(r[F]!==S)if(I&&0===f.length&&r.substring(F,F+a)===I){if(-1===g)return C();F=g+s,g=r.indexOf(x,F),p=r.indexOf(O,F);}else if(-1!==p&&(p<g||-1===g))f.push(r.substring(F,p)),F=p+e,p=r.indexOf(O,F);else{if(-1===g)break;if(f.push(r.substring(F,g)),w(g+s),o&&(R(),z))return C();if(D&&h.length>=D)return C(!0)}else for(m=F,F++;;){if(-1===(m=r.indexOf(S,m+1)))return i||u.push({type:"Quotes",code:"MissingQuotes",message:"Quoted field unterminated",row:h.length,index:F}),E();if(m===n-1)return E(r.substring(F,m).replace(_,S));if(S!==L||r[m+1]!==L){if(S===L||0===m||r[m-1]!==L){-1!==p&&p<m+1&&(p=r.indexOf(O,m+1)),-1!==g&&g<m+1&&(g=r.indexOf(x,m+1));var y=b(-1===g?p:Math.min(p,g));if(r.substr(m+1+y,e)===O){f.push(r.substring(F,m).replace(_,S)),r[F=m+1+y+e]!==S&&(m=r.indexOf(S,F)),p=r.indexOf(O,F),g=r.indexOf(x,F);break}var v=b(g);if(r.substring(m+1+v,m+1+v+s)===x){if(f.push(r.substring(F,m).replace(_,S)),w(m+1+v+s),p=r.indexOf(O,F),m=r.indexOf(S,F),o&&(R(),z))return C();if(D&&h.length>=D)return C(!0);break}u.push({type:"Quotes",code:"InvalidQuotes",message:"Trailing quote on quoted field is malformed",row:h.length,index:F}),m++;}}else m++;}return E();function k(e){h.push(e),d=F;}function b(e){var t=0;if(-1!==e){var i=r.substring(m+1,e);i&&""===i.trim()&&(t=i.length);}return t}function E(e){return i||(void 0===e&&(e=r.substring(F)),f.push(e),F=n,k(f),o&&R()),C()}function w(e){F=e,k(f),f=[],g=r.indexOf(x,F);}function C(e){return {data:h,errors:u,meta:{delimiter:O,linebreak:x,aborted:z,truncated:!!e,cursor:d+(t||0)}}}function R(){T(C()),h=[],u=[];}},this.abort=function(){z=!0;},this.getCharIndex=function(){return F};}function _(e){var t=e.data,i=a[t.workerId],r=!1;if(t.error)i.userError(t.error,t.file);else if(t.results&&t.results.data){var n={abort:function(){r=!0,m(t.workerId,{data:[],errors:[],meta:{aborted:!0}});},pause:y,resume:y};if(M(i.userStep)){for(var s=0;s<t.results.data.length&&(i.userStep({data:t.results.data[s],errors:t.results.errors,meta:t.results.meta},n),!r);s++);delete t.results;}else M(i.userChunk)&&(i.userChunk(t.results,n,t.file),delete t.results);}t.finished&&!r&&m(t.workerId,t.results);}function m(e,t){var i=a[e];M(i.userComplete)&&i.userComplete(t),i.terminate(),delete a[e];}function y(){throw new Error("Not implemented.")}function w(e){if("object"!=typeof e||null===e)return e;var t=Array.isArray(e)?[]:{};for(var i in e)t[i]=w(e[i]);return t}function v(e,t){return function(){e.apply(t,arguments);}}function M(e){return "function"==typeof e}return o&&(f.onmessage=function(e){var t=e.data;void 0===b.WORKER_ID&&t&&(b.WORKER_ID=t.workerId);if("string"==typeof t.input)f.postMessage({workerId:b.WORKER_ID,results:b.parse(t.input,t.config),finished:!0});else if(f.File&&t.input instanceof File||t.input instanceof Object){var i=b.parse(t.input,t.config);i&&f.postMessage({workerId:b.WORKER_ID,results:i,finished:!0});}}),(l.prototype=Object.create(u.prototype)).constructor=l,(c.prototype=Object.create(u.prototype)).constructor=c,(p.prototype=Object.create(p.prototype)).constructor=p,(g.prototype=Object.create(u.prototype)).constructor=g,b});
    });

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const data = writable([]);
    const labels = writable([]);

    const showUnclustered = writable(true);
    const showLabels = writable(true);

    const textField = writable('');
    const searchValue = writable('');
    const searchMap = writable([{'value':'', 'field':'', 'negate':false}]);
    const searchMode = writable('conjunction');

    const hoverText = writable('');
    const lassoMode = writable('zoom');
    const lassoSelected = writable(false);
    const tag = writable('');
    const colourBy = writable([]);

    /* static/svelte/Scatter.svelte generated by Svelte v3.12.1 */

    function create_fragment(ctx) {
    	var div;

    	return {
    		c() {
    			div = element("div");
    			attr(div, "class", "scatter svelte-xk1nbw");
    		},

    		m(target, anchor) {
    			insert(target, div, anchor);
    			ctx.div_binding(div);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d(detaching) {
    			if (detaching) {
    				detach(div);
    			}

    			ctx.div_binding(null);
    		}
    	};
    }

    var r = 5;

    function pointClick(d) {
     if (Object.keys(d).includes("website")) {
     window.open(d.website, '_blank').focus();
     } else if (Object.keys(d).includes("domain")) {
     window.open("http://" + d.domain, '_blank').focus();
     }
    }

    function pointMouseout(d) {
    hoverText.set('');

    d3.selectAll(".tooltip").remove();
    d3.select(this).style("r", r);
    }

    function lasso_start() {}

    function lasso_draw() {}

    function instance($$self, $$props, $$invalidate) {
    	let $data, $labels, $lassoSelected, $showUnclustered, $lassoMode, $tag, $showLabels, $searchMap, $searchMode, $colourBy;

    	component_subscribe($$self, data, $$value => { $data = $$value; $$invalidate('$data', $data); });
    	component_subscribe($$self, labels, $$value => { $labels = $$value; $$invalidate('$labels', $labels); });
    	component_subscribe($$self, lassoSelected, $$value => { $lassoSelected = $$value; $$invalidate('$lassoSelected', $lassoSelected); });
    	component_subscribe($$self, showUnclustered, $$value => { $showUnclustered = $$value; $$invalidate('$showUnclustered', $showUnclustered); });
    	component_subscribe($$self, lassoMode, $$value => { $lassoMode = $$value; $$invalidate('$lassoMode', $lassoMode); });
    	component_subscribe($$self, tag, $$value => { $tag = $$value; $$invalidate('$tag', $tag); });
    	component_subscribe($$self, showLabels, $$value => { $showLabels = $$value; $$invalidate('$showLabels', $showLabels); });
    	component_subscribe($$self, searchMap, $$value => { $searchMap = $$value; $$invalidate('$searchMap', $searchMap); });
    	component_subscribe($$self, searchMode, $$value => { $searchMode = $$value; $$invalidate('$searchMode', $searchMode); });
    	component_subscribe($$self, colourBy, $$value => { $colourBy = $$value; $$invalidate('$colourBy', $colourBy); });

    	

    var w = window.innerWidth * 0.75;
    var h = window.innerHeight * 0.95;

    var x;
    var y;
    var newX;
    var newY;
    var svg;

    var circles;
    var lasso;

    var zoom = d3.zoom()
                 .scaleExtent([0.8, 25])
                 .extent([[0, 0], [w, h]])
                 .on("zoom", transformCoords);
    function pointMouseover(d) {
      hoverText.set(d.description);

      var stopColumns = ["label", "description", "x", "y", "index", "vector"];
      var tooltipColumns = Object.keys(d);

      var html = "";
      for (const col of tooltipColumns) {
        if (!stopColumns.includes(col) && `${d[col]}`.length < 100) {
          html += "<b>" + col + ": </b>" + d[col] + "<br>";
        }
      }
      if (d.label !== "") {
        html += "<b>label: <span style='color:" + tagScale(d.label) + ";'>" + d.label + "</span></b>";
      }

      var tooltip = d3.select("div .scatter")
                      .append("div")
                      .attr("class", "tooltip")
                      .style("visibility", "visible");

      tooltip.html(html)
           .style("left", (d3.event.pageX + 15) + "px")
           .style("top", (d3.event.pageY - 28) + "px")
           .transition()
           .duration(100)
           .style("opacity", .9);

      d3.select(this).style("r", r * 2);
    }
    function transformCoords() {
      // recover the new scale
      newX = d3.event.transform.rescaleX(x);
      newY = d3.event.transform.rescaleY(y);

      // update circle position
      svg.selectAll("circle")
         .data($data)
         .attr('cx', function(d) {return newX(d.x)})
         .attr('cy', function(d) {return newY(d.y)});

     svg.selectAll(".cluster-label")
        .data($labels)
        .attr('x', function(d) {return newX(d.x)})
        .attr('y', function(d) {return newY(d.y)});
    }
    var seenData = false;
    var seenLabels = false;

    function init() {
      if (seenData && seenLabels) {
        return;
      }
      if ($data.length === 0) {
        return;
      } else {
        seenData = true;
      }
      if ($labels.length !== 0) {
        seenLabels = true;
      }
      var xs = $data.map(row => parseFloat(row['x']));
      var ys = $data.map(row => parseFloat(row['y']));

      var xmin = Math.min(...xs);
      var xmax = Math.max(...xs);
      var ymin = Math.min(...ys);
      var ymax = Math.max(...ys);

      x = d3.scaleLinear()
        .domain([xmin, xmax])
        .range([0, w]);

      y = d3.scaleLinear()
        .domain([ymin, ymax])
        .range([h, 0]);

      circles = svg.selectAll("circle")
          .data($data)
          .enter()
          .append("circle")
          .attr("cx", d => x(d.x))
          .attr("cy", d => y(d.y))
          .attr("r", r)
          .style("fill", "#c8c8c8")
          .on("mouseover", pointMouseover)
          .on("mouseout", pointMouseout)
          .on("click", pointClick);

      svg.selectAll("text")
          .data($labels)
          .enter()
          .append("text")
          .attr("x", d => x(d.x))
          .attr("y", d => y(d.y))
          .attr("class", "cluster-label")
          .style("font-size", "14px")
          .style("text-anchor", "middle")
          .text(d => d.label);

      if (( seenData && !seenLabels ) || ( !seenData && seenLabels )) {
        d3.select("div .scatter")
          .append("div")
          .attr("class", "tooltip")
          .style("visibility", "hidden");
      }
      console.log(circles);
      lasso = d3.lasso()
                .closePathSelect(true)
                .closePathDistance(100)
                .items(circles)
                .targetArea(svg)
                .on("start",lasso_start)
                .on("draw",lasso_draw)
                .on("end",lasso_end);

      handleShowUnclustered();
      handleShowLabels();
      handleLassoMode();
      updateLegend();
    }
    var tagScale = d3.scaleOrdinal(d3.schemeCategory10);
    function updateLegend() {
      var labels = Array.from(new Set($data.filter(d => d['label'] != '').map(d => d['label'])));
      var labelsCounts = labels.map(l => [l, $data.map(d => d['label']).filter(x => x == l).length]);
      labelsCounts = labelsCounts.sort((a,b) => b[1] - a[1]).slice(0, 5);

      var ordinal = d3.scaleOrdinal()
      .domain(labelsCounts.map(l => l[0] + ' ' + l[1]))
      .range(labelsCounts.map(l => tagScale(l[0])));

      svg.selectAll("g.legendOrdinal").remove();

      svg.append("g")
        .attr("class", "legendOrdinal")
        .attr("transform", "translate(20,20)");

      var legendOrdinal = d3.legendColor()
        .shape("path", d3.symbol().type(d3.symbolCircle).size(150)())
        .shapePadding(10)
        .scale(ordinal);

      svg.select(".legendOrdinal")
        .call(legendOrdinal);
    }
    function lasso_end() {
      var selected;
      if ($lassoSelected) {
        selected = lasso.selectedItems(d3.selectAll("circle")).filter(".selected").data();
      } else {
        selected = lasso.selectedItems(d3.selectAll("circle")).data();
      }

      if (!$showUnclustered) {
        selected = selected.filter(c => c.cluster !== "-1");
      }
      var selectedIndices = selected.map(c => c.index);
      console.log(selectedIndices);

      var dataCopy = JSON.parse(JSON.stringify($data));
      dataCopy.forEach(function(d, i) {
        if (selectedIndices.includes(d.index)) {
          dataCopy[i]["label"] = ($lassoMode === "erase") ? "" : $tag;
        }  });

      data.set(dataCopy);

      if (selectedIndices.length > 0) {
        colourBy.set(['label', 'categorical']);
        handleColourBy();
      }
      colourBy.set(['label', 'categorical']);
      updateLegend();
    }
    function handleShowUnclustered() {
      svg.selectAll("circle")
        .data($data)
        .style("visibility", d => {
          if ($showUnclustered) {
            return "visible";
          } else {
            return (d["cluster"] == -1) ? "hidden" : "visible";
          }    });
    }
    function handleShowLabels() {
      svg.selectAll(".cluster-label")
         .style("visibility", ($showLabels) ? "visible" : "hidden");
    }
    function handleSearch() {
      svg.selectAll("circle")
        .data($data)
        .style("fill-opacity", 0.3)
        .style("stroke", "none");

      var regexSearch = function(d, i) {
        var field;
        var value;
        var negate;
        var regex;
        var match;

        var searchMapCopy = $searchMap.filter(s => s['value'] !== '');
        if (searchMapCopy.length === 0) {
          return false;
        }

        try {
          for (let i = 0; i < searchMapCopy.length; i++) {
            field = searchMapCopy[i]['field'];
            value = searchMapCopy[i]['value'];
            negate = searchMapCopy[i]['negate'];
            regex = new RegExp('\\b' + value + '\\b', 'i');
            match = d[field].toLowerCase().search(regex) != -1;

            if (negate) {
              match = !match;
            };

            if ($searchMode === 'conjunction') {
              if (!match) {
                return false;
              };
            } else {
              if (match) {
                return true;
              };
            };

          };
        } catch (error) {
          return false;
        }    return $searchMode === 'conjunction';
      };

      // try {
      //   var regex = new RegExp('\\b' + $searchValue + '\\b', 'i');
      // } catch (error) {
      //   console.error(error);
      //   return
      // };

      svg.selectAll("circle")
        .data($data)
        .classed('selected', false);

      svg.selectAll("circle")
        .data($data)
        .filter(regexSearch)
        .style("fill-opacity", 0.7)
        .style("stroke", "black")
        .classed('selected', true);
    }
    function handleLassoMode() {
      if ($tag === 'Add Label') {
        lassoMode.set('zoom');
        return
      }
      if ($lassoMode === 'zoom') {
        svg.call(zoom);
        svg.on(".dragstart", null)
           .on(".drag", null)
           .on(".dragend", null);

      } else {
        svg.on('.zoom', null);
        svg.call(lasso);
      }}
    function handleColourBy() {
      var colourColumn;
      var colourScaleType;
      if ($colourBy.length === 0) {
        colourScaleType = 'none';
      } else {
        colourColumn = $colourBy[0];
        colourScaleType = $colourBy[1];
      }

      if (colourScaleType === 'continuous') {

        var elems = $data.filter(row => row[colourColumn] !== '').map(row => parseFloat(row[colourColumn]));
        var minVal = Math.min(...elems);
        var maxVal = Math.max(...elems);
        var continuousScale = d3.scaleSequential().domain([minVal, maxVal]).interpolator(d3.interpolateCool);
        svg.selectAll("circle")
          .data($data)
          .style("fill", d => (d[colourColumn] === "") ? "#c8c8c8" : continuousScale(parseFloat(d[colourColumn])));

      } else if (colourColumn === 'label') {

        svg.selectAll("circle")
          .data($data)
          .style("fill", d => (d[colourColumn] === "") ? "#c8c8c8" : tagScale(d[colourColumn]));

      } else if (colourScaleType === 'categorical') {
        var categoricalScale = d3.scaleOrdinal(d3.schemeCategory10);
        svg.selectAll("circle")
          .data($data)
          .style("fill", d => (d[colourColumn] === "" || (colourColumn === "cluster" && d[colourColumn] === "-1")) ? "#c8c8c8" : categoricalScale(d[colourColumn]));

      } else {
        svg.selectAll("circle")
          .data($data)
          .style("fill", "#c8c8c8");
      }}
    let el;
    onMount(() => {

      svg = d3.select(el)
        .append("svg")
        .attr("width", w)
        .attr("height", h)
        .on("wheel", function(e, d) {
          lassoMode.set("zoom");
        }).on("contextmenu", function (e, d) {
          d3.event.preventDefault();
          lassoMode.set("lasso");
        });

      data.subscribe(() => {
        init();
        dataGlobal = $data;
      });

      labels.subscribe(() => {
        init();
      });

      showUnclustered.subscribe(handleShowUnclustered);
      showLabels.subscribe(handleShowLabels);
      searchValue.subscribe(handleSearch);
      textField.subscribe(handleSearch);
      lassoMode.subscribe(handleLassoMode);
      colourBy.subscribe(handleColourBy);
      searchMap.subscribe(handleSearch);
      searchMode.subscribe(handleSearch);
    });

    	function div_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			$$invalidate('el', el = $$value);
    		});
    	}

    	return { el, div_binding };
    }

    class Scatter extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance, create_fragment, safe_not_equal, []);
    	}
    }

    /* static/svelte/Search.svelte generated by Svelte v3.12.1 */
    const { Object: Object_1 } = globals;

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = Object_1.create(ctx);
    	child_ctx.column = list[i];
    	return child_ctx;
    }

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object_1.create(ctx);
    	child_ctx._ = list[i];
    	child_ctx.i = i;
    	return child_ctx;
    }

    // (80:8) {#each columns as column}
    function create_each_block_1(ctx) {
    	var option, t0_value = ctx.column + "", t0, t1, option_value_value;

    	return {
    		c() {
    			option = element("option");
    			t0 = text(t0_value);
    			t1 = space();
    			option.__value = option_value_value = ctx.column;
    			option.value = option.__value;
    		},

    		m(target, anchor) {
    			insert(target, option, anchor);
    			append(option, t0);
    			append(option, t1);
    		},

    		p(changed, ctx) {
    			if ((changed.columns) && t0_value !== (t0_value = ctx.column + "")) {
    				set_data(t0, t0_value);
    			}

    			if ((changed.columns) && option_value_value !== (option_value_value = ctx.column)) {
    				option.__value = option_value_value;
    			}

    			option.value = option.__value;
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(option);
    			}
    		}
    	};
    }

    // (88:4) {#if i == searchNum-1}
    function create_if_block_1(ctx) {
    	var div, button, dispose;

    	return {
    		c() {
    			div = element("div");
    			button = element("button");
    			button.textContent = "+";
    			attr(button, "class", "settings-component");
    			set_style(div, "float", "left");
    			set_style(div, "margin-left", "10px");
    			dispose = listen(button, "click", ctx.increment);
    		},

    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, button);
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(div);
    			}

    			dispose();
    		}
    	};
    }

    // (93:4) {#if (i == searchNum-1) && (i != 0)}
    function create_if_block(ctx) {
    	var div, button, dispose;

    	return {
    		c() {
    			div = element("div");
    			button = element("button");
    			button.textContent = "-";
    			attr(button, "class", "settings-component");
    			set_style(div, "float", "left");
    			set_style(div, "margin-left", "10px");
    			dispose = listen(button, "click", ctx.decrement);
    		},

    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, button);
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(div);
    			}

    			dispose();
    		}
    	};
    }

    // (68:0) {#each Array(searchNum) as _, i}
    function create_each_block(ctx) {
    	var div3, div0, button, t1, div1, input, t2, div2, select, t3, t4, dispose;

    	function click_handler() {
    		return ctx.click_handler(ctx);
    	}

    	function input_input_handler() {
    		ctx.input_input_handler.call(input, ctx);
    	}

    	let each_value_1 = ctx.columns;

    	let each_blocks = [];

    	for (let i_1 = 0; i_1 < each_value_1.length; i_1 += 1) {
    		each_blocks[i_1] = create_each_block_1(get_each_context_1(ctx, each_value_1, i_1));
    	}

    	function select_change_handler() {
    		ctx.select_change_handler.call(select, ctx);
    	}

    	var if_block0 = (ctx.i == ctx.searchNum-1) && create_if_block_1(ctx);

    	var if_block1 = ((ctx.i == ctx.searchNum-1) && (ctx.i != 0)) && create_if_block(ctx);

    	return {
    		c() {
    			div3 = element("div");
    			div0 = element("div");
    			button = element("button");
    			button.textContent = "!";
    			t1 = space();
    			div1 = element("div");
    			input = element("input");
    			t2 = space();
    			div2 = element("div");
    			select = element("select");

    			for (let i_1 = 0; i_1 < each_blocks.length; i_1 += 1) {
    				each_blocks[i_1].c();
    			}

    			t3 = space();
    			if (if_block0) if_block0.c();
    			t4 = space();
    			if (if_block1) if_block1.c();
    			attr(button, "class", "settings-component svelte-866kqo");
    			toggle_class(button, "active", ctx.searchMapLocal[ctx.i]['negate']);
    			set_style(div0, "float", "left");
    			set_style(div0, "margin-right", "10px");
    			attr(input, "class", "settings-component");
    			attr(input, "type", "search");
    			set_style(div1, "float", "left");
    			set_style(div1, "margin-right", "10px");
    			if (ctx.searchMapLocal[ctx.i]['field'] === void 0) add_render_callback(select_change_handler);
    			attr(select, "class", "settings-component svelte-866kqo");
    			attr(select, "name", "text-to-search");
    			attr(select, "id", "text-to-search");
    			set_style(div2, "float", "left");
    			attr(div3, "class", "search-container svelte-866kqo");

    			dispose = [
    				listen(button, "click", click_handler),
    				listen(input, "input", input_input_handler),
    				listen(input, "search", ctx.handleSearch),
    				listen(select, "change", select_change_handler),
    				listen(select, "change", ctx.handleSearch)
    			];
    		},

    		m(target, anchor) {
    			insert(target, div3, anchor);
    			append(div3, div0);
    			append(div0, button);
    			append(div3, t1);
    			append(div3, div1);
    			append(div1, input);

    			set_input_value(input, ctx.searchMapLocal[ctx.i]['value']);

    			append(div3, t2);
    			append(div3, div2);
    			append(div2, select);

    			for (let i_1 = 0; i_1 < each_blocks.length; i_1 += 1) {
    				each_blocks[i_1].m(select, null);
    			}

    			select_option(select, ctx.searchMapLocal[ctx.i]['field']);

    			append(div3, t3);
    			if (if_block0) if_block0.m(div3, null);
    			append(div3, t4);
    			if (if_block1) if_block1.m(div3, null);
    		},

    		p(changed, new_ctx) {
    			ctx = new_ctx;
    			if (changed.searchMapLocal) {
    				toggle_class(button, "active", ctx.searchMapLocal[ctx.i]['negate']);
    			}

    			if (changed.searchMapLocal) set_input_value(input, ctx.searchMapLocal[ctx.i]['value']);

    			if (changed.columns) {
    				each_value_1 = ctx.columns;

    				let i_1;
    				for (i_1 = 0; i_1 < each_value_1.length; i_1 += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i_1);

    					if (each_blocks[i_1]) {
    						each_blocks[i_1].p(changed, child_ctx);
    					} else {
    						each_blocks[i_1] = create_each_block_1(child_ctx);
    						each_blocks[i_1].c();
    						each_blocks[i_1].m(select, null);
    					}
    				}

    				for (; i_1 < each_blocks.length; i_1 += 1) {
    					each_blocks[i_1].d(1);
    				}
    				each_blocks.length = each_value_1.length;
    			}

    			if (changed.searchMapLocal) select_option(select, ctx.searchMapLocal[ctx.i]['field']);

    			if (ctx.i == ctx.searchNum-1) {
    				if (!if_block0) {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					if_block0.m(div3, t4);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if ((ctx.i == ctx.searchNum-1) && (ctx.i != 0)) {
    				if (!if_block1) {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					if_block1.m(div3, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(div3);
    			}

    			destroy_each(each_blocks, detaching);

    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	var center, p, t0, t1, t2, t3, div, label0, input0, input0_checked_value, t4, t5, label1, input1, input1_checked_value, t6, dispose;

    	let each_value = Array(ctx.searchNum);

    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	return {
    		c() {
    			center = element("center");
    			p = element("p");
    			t0 = text(ctx.selected);
    			t1 = text(" Selected");
    			t2 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t3 = space();
    			div = element("div");
    			label0 = element("label");
    			input0 = element("input");
    			t4 = text(" Conjunction");
    			t5 = space();
    			label1 = element("label");
    			input1 = element("input");
    			t6 = text(" Disjunction");
    			input0.checked = input0_checked_value = ctx.$searchMode==="conjunction";
    			attr(input0, "type", "radio");
    			attr(input0, "name", "amount");
    			input0.value = "conjunction";
    			input1.checked = input1_checked_value = ctx.$searchMode==="disjunction";
    			attr(input1, "type", "radio");
    			attr(input1, "name", "amount");
    			input1.value = "disjunction";
    			attr(div, "class", "search-container svelte-866kqo");

    			dispose = [
    				listen(input0, "change", ctx.modeChange),
    				listen(input1, "change", ctx.modeChange)
    			];
    		},

    		m(target, anchor) {
    			insert(target, center, anchor);
    			append(center, p);
    			append(p, t0);
    			append(p, t1);
    			insert(target, t2, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert(target, t3, anchor);
    			insert(target, div, anchor);
    			append(div, label0);
    			append(label0, input0);
    			append(label0, t4);
    			append(div, t5);
    			append(div, label1);
    			append(label1, input1);
    			append(label1, t6);
    		},

    		p(changed, ctx) {
    			if (changed.selected) {
    				set_data(t0, ctx.selected);
    			}

    			if (changed.searchNum || changed.searchMapLocal || changed.columns) {
    				each_value = Array(ctx.searchNum);

    				let i;
    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(t3.parentNode, t3);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value.length;
    			}

    			if ((changed.$searchMode) && input0_checked_value !== (input0_checked_value = ctx.$searchMode==="conjunction")) {
    				input0.checked = input0_checked_value;
    			}

    			if ((changed.$searchMode) && input1_checked_value !== (input1_checked_value = ctx.$searchMode==="disjunction")) {
    				input1.checked = input1_checked_value;
    			}
    		},

    		i: noop,
    		o: noop,

    		d(detaching) {
    			if (detaching) {
    				detach(center);
    				detach(t2);
    			}

    			destroy_each(each_blocks, detaching);

    			if (detaching) {
    				detach(t3);
    				detach(div);
    			}

    			run_all(dispose);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $data, $searchMap, $searchValue, $searchMode;

    	component_subscribe($$self, data, $$value => { $data = $$value; $$invalidate('$data', $data); });
    	component_subscribe($$self, searchMap, $$value => { $searchMap = $$value; $$invalidate('$searchMap', $searchMap); });
    	component_subscribe($$self, searchValue, $$value => { $searchValue = $$value; $$invalidate('$searchValue', $searchValue); });
    	component_subscribe($$self, searchMode, $$value => { $searchMode = $$value; $$invalidate('$searchMode', $searchMode); });

    	var columns = [];
    var fetchedColumns;

    var selected = 0;
    var searchNum = 1;
    var searchMapLocal = [{'value':'', 'field':'', 'negate':false}];

    function fetchColumns() {
      if (($data.length !== 0) && (!fetchedColumns)) {
        $$invalidate('columns', columns = Object.keys($data[0]));
        $$invalidate('columns', columns = columns.filter(column => !$data.every(d => /^\-?[0-9]*\.?[0-9]+$/.test(d[column]))));

        textField.set(columns[0]);

        searchMapLocal.forEach(d => d['field'] = columns[0]);
        fetchedColumns = true;
      }
    }
    data.subscribe(() => {
      fetchColumns();
    });

    searchMap.subscribe(value => {
      console.log(value);
    });

    function handleSearch(d) {
      set_store_value(searchMap, $searchMap = searchMapLocal);
      $$invalidate('selected', selected = d3.selectAll("circle").filter(".selected").data().length);
    }

    var text = $searchValue;
    function increment() {
      $$invalidate('searchNum', searchNum += 1);
      searchMapLocal.push({'value':'', 'field':columns[0], 'negate':false});
      set_store_value(searchMap, $searchMap = searchMapLocal);
      $$invalidate('selected', selected = d3.selectAll("circle").filter(".selected").data().length);
    }

    function decrement() {
      $$invalidate('searchNum', searchNum -= 1);
      searchMapLocal.pop();
      set_store_value(searchMap, $searchMap = searchMapLocal);
      $$invalidate('selected', selected = d3.selectAll("circle").filter(".selected").data().length);
    }

    function negate(i) {
      $$invalidate('searchMapLocal', searchMapLocal[i]['negate'] = !searchMapLocal[i]['negate'], searchMapLocal);
      set_store_value(searchMap, $searchMap = searchMapLocal);
      $$invalidate('selected', selected = d3.selectAll("circle").filter(".selected").data().length);
    }

    function modeChange() {
      set_store_value(searchMode, $searchMode = event.currentTarget.value);
    }

    	const click_handler = ({ i }) => negate(i);

    	function input_input_handler({ i }) {
    		searchMapLocal[i]['value'] = this.value;
    		$$invalidate('searchMapLocal', searchMapLocal);
    		$$invalidate('columns', columns);
    	}

    	function select_change_handler({ i }) {
    		searchMapLocal[i]['field'] = select_value(this);
    		$$invalidate('searchMapLocal', searchMapLocal);
    		$$invalidate('columns', columns);
    	}

    	$$self.$$.update = ($$dirty = { text: 1 }) => {
    		if ($$dirty.text) { if (text === '') {
          handleSearch();
        } }
    	};

    	return {
    		columns,
    		selected,
    		searchNum,
    		searchMapLocal,
    		handleSearch,
    		increment,
    		decrement,
    		negate,
    		modeChange,
    		$searchMode,
    		click_handler,
    		input_input_handler,
    		select_change_handler
    	};
    }

    class Search extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, []);
    	}
    }

    /* static/svelte/CheckboxUnclustered.svelte generated by Svelte v3.12.1 */

    function create_fragment$2(ctx) {
    	var label, input, t, dispose;

    	return {
    		c() {
    			label = element("label");
    			input = element("input");
    			t = text("\r\n\tShow Unclustered");
    			attr(input, "type", "checkbox");
    			dispose = listen(input, "change", ctx.input_change_handler);
    		},

    		m(target, anchor) {
    			insert(target, label, anchor);
    			append(label, input);

    			input.checked = ctx.$showUnclustered;

    			append(label, t);
    		},

    		p(changed, ctx) {
    			if (changed.$showUnclustered) input.checked = ctx.$showUnclustered;
    		},

    		i: noop,
    		o: noop,

    		d(detaching) {
    			if (detaching) {
    				detach(label);
    			}

    			dispose();
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $showUnclustered;

    	component_subscribe($$self, showUnclustered, $$value => { $showUnclustered = $$value; $$invalidate('$showUnclustered', $showUnclustered); });

    	function input_change_handler() {
    		showUnclustered.set(this.checked);
    	}

    	return { $showUnclustered, input_change_handler };
    }

    class CheckboxUnclustered extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, []);
    	}
    }

    /* static/svelte/CheckboxLabels.svelte generated by Svelte v3.12.1 */

    function create_fragment$3(ctx) {
    	var label, input, t, dispose;

    	return {
    		c() {
    			label = element("label");
    			input = element("input");
    			t = text("\r\n\tShow Labels");
    			attr(input, "type", "checkbox");
    			dispose = listen(input, "change", ctx.input_change_handler);
    		},

    		m(target, anchor) {
    			insert(target, label, anchor);
    			append(label, input);

    			input.checked = ctx.$showLabels;

    			append(label, t);
    		},

    		p(changed, ctx) {
    			if (changed.$showLabels) input.checked = ctx.$showLabels;
    		},

    		i: noop,
    		o: noop,

    		d(detaching) {
    			if (detaching) {
    				detach(label);
    			}

    			dispose();
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $showLabels;

    	component_subscribe($$self, showLabels, $$value => { $showLabels = $$value; $$invalidate('$showLabels', $showLabels); });

    	function input_change_handler() {
    		showLabels.set(this.checked);
    	}

    	return { $showLabels, input_change_handler };
    }

    class CheckboxLabels extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, []);
    	}
    }

    /* static/svelte/DescriptionBox.svelte generated by Svelte v3.12.1 */

    function create_fragment$4(ctx) {
    	var div, p, raw_value = ctx.formatText(ctx.$hoverText) + "";

    	return {
    		c() {
    			div = element("div");
    			p = element("p");
    			attr(div, "class", "description-box svelte-1czamdy");
    		},

    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, p);
    			p.innerHTML = raw_value;
    		},

    		p(changed, ctx) {
    			if ((changed.$hoverText) && raw_value !== (raw_value = ctx.formatText(ctx.$hoverText) + "")) {
    				p.innerHTML = raw_value;
    			}
    		},

    		i: noop,
    		o: noop,

    		d(detaching) {
    			if (detaching) {
    				detach(div);
    			}
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let $searchValue, $hoverText;

    	component_subscribe($$self, searchValue, $$value => { $searchValue = $$value; $$invalidate('$searchValue', $searchValue); });
    	component_subscribe($$self, hoverText, $$value => { $hoverText = $$value; $$invalidate('$hoverText', $hoverText); });

    	function formatText(text) {
        text = text.slice(0, 1000) + ((text.length > 1000) ? "..." : "");

        if ($searchValue !== '') {
          try {
            var regex = new RegExp('\\b(' + $searchValue + ')\\b', 'ig');
            text = text.replaceAll(regex, '<span class="text-highlight">$1</span>');
          } catch (error) {
              console.error(error);
              return
          }    }

      return text
    }

    	return { formatText, $hoverText };
    }

    class DescriptionBox extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, []);
    	}
    }

    /* static/svelte/LassoToggle.svelte generated by Svelte v3.12.1 */

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.tag = list[i];
    	return child_ctx;
    }

    // (50:4) {:else}
    function create_else_block_2(ctx) {
    	var button, dispose;

    	return {
    		c() {
    			button = element("button");
    			button.textContent = "Lasso";
    			attr(button, "class", "settings-component svelte-gm3lox");
    			toggle_class(button, "active", ctx.$lassoMode === 'lasso');
    			dispose = listen(button, "click", ctx.click_handler_1);
    		},

    		m(target, anchor) {
    			insert(target, button, anchor);
    		},

    		p(changed, ctx) {
    			if (changed.$lassoMode) {
    				toggle_class(button, "active", ctx.$lassoMode === 'lasso');
    			}
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(button);
    			}

    			dispose();
    		}
    	};
    }

    // (48:4) {#if $tag === "Add Label"}
    function create_if_block_2(ctx) {
    	var button;

    	return {
    		c() {
    			button = element("button");
    			button.textContent = "Lasso";
    			attr(button, "class", "settings-component svelte-gm3lox");
    			button.disabled = true;
    		},

    		m(target, anchor) {
    			insert(target, button, anchor);
    		},

    		p: noop,

    		d(detaching) {
    			if (detaching) {
    				detach(button);
    			}
    		}
    	};
    }

    // (57:4) {:else}
    function create_else_block_1(ctx) {
    	var button, dispose;

    	return {
    		c() {
    			button = element("button");
    			button.textContent = "Erase";
    			attr(button, "class", "settings-component svelte-gm3lox");
    			toggle_class(button, "active", ctx.$lassoMode === 'erase');
    			dispose = listen(button, "click", ctx.click_handler_2);
    		},

    		m(target, anchor) {
    			insert(target, button, anchor);
    		},

    		p(changed, ctx) {
    			if (changed.$lassoMode) {
    				toggle_class(button, "active", ctx.$lassoMode === 'erase');
    			}
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(button);
    			}

    			dispose();
    		}
    	};
    }

    // (55:4) {#if $tag === "Add Label"}
    function create_if_block_1$1(ctx) {
    	var button;

    	return {
    		c() {
    			button = element("button");
    			button.textContent = "Erase";
    			attr(button, "class", "settings-component svelte-gm3lox");
    			button.disabled = true;
    		},

    		m(target, anchor) {
    			insert(target, button, anchor);
    		},

    		p: noop,

    		d(detaching) {
    			if (detaching) {
    				detach(button);
    			}
    		}
    	};
    }

    // (63:6) {#each tags as tag}
    function create_each_block$1(ctx) {
    	var option, t0_value = ctx.tag + "", t0, t1, option_value_value;

    	return {
    		c() {
    			option = element("option");
    			t0 = text(t0_value);
    			t1 = space();
    			option.__value = option_value_value = ctx.tag;
    			option.value = option.__value;
    		},

    		m(target, anchor) {
    			insert(target, option, anchor);
    			append(option, t0);
    			append(option, t1);
    		},

    		p(changed, ctx) {
    			if ((changed.tags) && t0_value !== (t0_value = ctx.tag + "")) {
    				set_data(t0, t0_value);
    			}

    			if ((changed.tags) && option_value_value !== (option_value_value = ctx.tag)) {
    				option.__value = option_value_value;
    			}

    			option.value = option.__value;
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(option);
    			}
    		}
    	};
    }

    // (76:4) {:else}
    function create_else_block(ctx) {
    	var input;

    	return {
    		c() {
    			input = element("input");
    			attr(input, "class", "settings-component svelte-gm3lox");
    			attr(input, "type", "search");
    			input.disabled = true;
    		},

    		m(target, anchor) {
    			insert(target, input, anchor);
    		},

    		p: noop,

    		d(detaching) {
    			if (detaching) {
    				detach(input);
    			}
    		}
    	};
    }

    // (74:4) {#if $tag === "Add Label"}
    function create_if_block$1(ctx) {
    	var input, dispose;

    	return {
    		c() {
    			input = element("input");
    			attr(input, "class", "settings-component svelte-gm3lox");
    			attr(input, "type", "search");

    			dispose = [
    				listen(input, "input", ctx.input_input_handler),
    				listen(input, "search", ctx.handleAddLabel)
    			];
    		},

    		m(target, anchor) {
    			insert(target, input, anchor);

    			set_input_value(input, ctx.newLabel);
    		},

    		p(changed, ctx) {
    			if (changed.newLabel) set_input_value(input, ctx.newLabel);
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(input);
    			}

    			run_all(dispose);
    		}
    	};
    }

    function create_fragment$5(ctx) {
    	var div7, div0, button, t1, div1, t2, div2, t3, div3, select, option, t5, div5, center0, div4, t6, div6, center1, label, input, t7, dispose;

    	function select_block_type(changed, ctx) {
    		if (ctx.$tag === "Add Label") return create_if_block_2;
    		return create_else_block_2;
    	}

    	var current_block_type = select_block_type(null, ctx);
    	var if_block0 = current_block_type(ctx);

    	function select_block_type_1(changed, ctx) {
    		if (ctx.$tag === "Add Label") return create_if_block_1$1;
    		return create_else_block_1;
    	}

    	var current_block_type_1 = select_block_type_1(null, ctx);
    	var if_block1 = current_block_type_1(ctx);

    	let each_value = ctx.tags;

    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	function select_block_type_2(changed, ctx) {
    		if (ctx.$tag === "Add Label") return create_if_block$1;
    		return create_else_block;
    	}

    	var current_block_type_2 = select_block_type_2(null, ctx);
    	var if_block2 = current_block_type_2(ctx);

    	return {
    		c() {
    			div7 = element("div");
    			div0 = element("div");
    			button = element("button");
    			button.textContent = "Zoom";
    			t1 = space();
    			div1 = element("div");
    			if_block0.c();
    			t2 = space();
    			div2 = element("div");
    			if_block1.c();
    			t3 = space();
    			div3 = element("div");
    			select = element("select");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			option = element("option");
    			option.textContent = "Add Label";
    			t5 = space();
    			div5 = element("div");
    			center0 = element("center");
    			div4 = element("div");
    			if_block2.c();
    			t6 = space();
    			div6 = element("div");
    			center1 = element("center");
    			label = element("label");
    			input = element("input");
    			t7 = text("\r\n  \tLasso Selected");
    			attr(button, "class", "settings-component svelte-gm3lox");
    			toggle_class(button, "active", ctx.$lassoMode === 'zoom');
    			attr(div0, "class", "grid1 svelte-gm3lox");
    			attr(div1, "class", "grid2 svelte-gm3lox");
    			attr(div2, "class", "grid3 svelte-gm3lox");
    			option.__value = "Add Label";
    			option.value = option.__value;
    			if (ctx.$tag === void 0) add_render_callback(() => ctx.select_change_handler.call(select));
    			attr(select, "class", "settings-component svelte-gm3lox");
    			attr(select, "name", "select-tag");
    			attr(select, "id", "select-tag");
    			attr(div3, "class", "grid4 svelte-gm3lox");
    			attr(div4, "class", "add-label svelte-gm3lox");
    			attr(div5, "class", "grid5 svelte-gm3lox");
    			attr(input, "type", "checkbox");
    			attr(div6, "class", "grid6 svelte-gm3lox");
    			attr(div7, "class", "container svelte-gm3lox");

    			dispose = [
    				listen(button, "click", ctx.click_handler),
    				listen(select, "change", ctx.select_change_handler),
    				listen(input, "change", ctx.input_change_handler)
    			];
    		},

    		m(target, anchor) {
    			insert(target, div7, anchor);
    			append(div7, div0);
    			append(div0, button);
    			append(div7, t1);
    			append(div7, div1);
    			if_block0.m(div1, null);
    			append(div7, t2);
    			append(div7, div2);
    			if_block1.m(div2, null);
    			append(div7, t3);
    			append(div7, div3);
    			append(div3, select);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select, null);
    			}

    			append(select, option);

    			select_option(select, ctx.$tag);

    			append(div7, t5);
    			append(div7, div5);
    			append(div5, center0);
    			append(center0, div4);
    			if_block2.m(div4, null);
    			append(div7, t6);
    			append(div7, div6);
    			append(div6, center1);
    			append(center1, label);
    			append(label, input);

    			input.checked = ctx.$lassoSelected;

    			append(label, t7);
    		},

    		p(changed, ctx) {
    			if (changed.$lassoMode) {
    				toggle_class(button, "active", ctx.$lassoMode === 'zoom');
    			}

    			if (current_block_type === (current_block_type = select_block_type(changed, ctx)) && if_block0) {
    				if_block0.p(changed, ctx);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);
    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div1, null);
    				}
    			}

    			if (current_block_type_1 === (current_block_type_1 = select_block_type_1(changed, ctx)) && if_block1) {
    				if_block1.p(changed, ctx);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type_1(ctx);
    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(div2, null);
    				}
    			}

    			if (changed.tags) {
    				each_value = ctx.tags;

    				let i;
    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select, option);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value.length;
    			}

    			if (changed.$tag) select_option(select, ctx.$tag);

    			if (current_block_type_2 === (current_block_type_2 = select_block_type_2(changed, ctx)) && if_block2) {
    				if_block2.p(changed, ctx);
    			} else {
    				if_block2.d(1);
    				if_block2 = current_block_type_2(ctx);
    				if (if_block2) {
    					if_block2.c();
    					if_block2.m(div4, null);
    				}
    			}

    			if (changed.$lassoSelected) input.checked = ctx.$lassoSelected;
    		},

    		i: noop,
    		o: noop,

    		d(detaching) {
    			if (detaching) {
    				detach(div7);
    			}

    			if_block0.d();
    			if_block1.d();

    			destroy_each(each_blocks, detaching);

    			if_block2.d();
    			run_all(dispose);
    		}
    	};
    }

    function handleClick(mode) {
      lassoMode.set(mode);
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let $data, $lassoMode, $tag, $lassoSelected;

    	component_subscribe($$self, data, $$value => { $data = $$value; $$invalidate('$data', $data); });
    	component_subscribe($$self, lassoMode, $$value => { $lassoMode = $$value; $$invalidate('$lassoMode', $lassoMode); });
    	component_subscribe($$self, tag, $$value => { $tag = $$value; $$invalidate('$tag', $tag); });
    	component_subscribe($$self, lassoSelected, $$value => { $lassoSelected = $$value; $$invalidate('$lassoSelected', $lassoSelected); });

    	var newLabel = "";
      var tags = [];
      var fetchedTags = false;

      function fetchTags() {
        if (($data.length !== 0) && (!fetchedTags)) {
          $$invalidate('tags', tags = [...new Set($data.map(d => d.label).filter(d => d !== ''))]);
          console.log(tags);
          if (tags.length === 0) {
            tag.set('Add Label');
          } else {
            tag.set(tags[0]);
          }
          fetchedTags = true;
        }
      }
      function handleAddLabel() {
        tags.push(newLabel);
        $$invalidate('tags', tags);
        tag.set(newLabel);
        $$invalidate('newLabel', newLabel = '');
      }
      data.subscribe(() => {
        fetchTags();
      });

      tag.subscribe(value => {
        if (value === "Add Label") {
          lassoMode.set('zoom');
        }  });

    	const click_handler = () => handleClick('zoom');

    	const click_handler_1 = () => handleClick('lasso');

    	const click_handler_2 = () => handleClick('erase');

    	function select_change_handler() {
    		tag.set(select_value(this));
    		$$invalidate('tags', tags);
    	}

    	function input_input_handler() {
    		newLabel = this.value;
    		$$invalidate('newLabel', newLabel);
    	}

    	function input_change_handler() {
    		lassoSelected.set(this.checked);
    	}

    	return {
    		newLabel,
    		tags,
    		handleAddLabel,
    		$lassoMode,
    		$tag,
    		$lassoSelected,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		select_change_handler,
    		input_input_handler,
    		input_change_handler
    	};
    }

    class LassoToggle extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, []);
    	}
    }

    /* static/svelte/ColourSelect.svelte generated by Svelte v3.12.1 */
    const { Object: Object_1$1 } = globals;

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = Object_1$1.create(ctx);
    	child_ctx.column = list[i];
    	return child_ctx;
    }

    // (64:2) {#each columns as column}
    function create_each_block$2(ctx) {
    	var option, t0_value = ctx.column + "", t0, t1, option_value_value;

    	return {
    		c() {
    			option = element("option");
    			t0 = text(t0_value);
    			t1 = space();
    			option.__value = option_value_value = ctx.column;
    			option.value = option.__value;
    		},

    		m(target, anchor) {
    			insert(target, option, anchor);
    			append(option, t0);
    			append(option, t1);
    		},

    		p(changed, ctx) {
    			if ((changed.columns) && t0_value !== (t0_value = ctx.column + "")) {
    				set_data(t0, t0_value);
    			}

    			if ((changed.columns) && option_value_value !== (option_value_value = ctx.column)) {
    				option.__value = option_value_value;
    			}

    			option.value = option.__value;
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(option);
    			}
    		}
    	};
    }

    function create_fragment$6(ctx) {
    	var label, t, select, dispose;

    	let each_value = ctx.columns;

    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	return {
    		c() {
    			label = element("label");
    			t = text("Colour By:\r\n");
    			select = element("select");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			if (ctx.selectedColumn === void 0) add_render_callback(() => ctx.select_change_handler.call(select));
    			attr(select, "class", "settings-component");
    			attr(select, "name", "select-colour-column");
    			attr(select, "id", "select-colour-column");
    			dispose = listen(select, "change", ctx.select_change_handler);
    		},

    		m(target, anchor) {
    			insert(target, label, anchor);
    			append(label, t);
    			append(label, select);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(select, null);
    			}

    			select_option(select, ctx.selectedColumn);
    		},

    		p(changed, ctx) {
    			if (changed.columns) {
    				each_value = ctx.columns;

    				let i;
    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value.length;
    			}

    			if (changed.selectedColumn) select_option(select, ctx.selectedColumn);
    		},

    		i: noop,
    		o: noop,

    		d(detaching) {
    			if (detaching) {
    				detach(label);
    			}

    			destroy_each(each_blocks, detaching);

    			dispose();
    		}
    	};
    }

    function isContinuousColumn(elems) {
    var p1 = elems.some(elem => /^\-?[0-9]*\.?[0-9]+$/.test(elem));
    var p2 = [...new Set(elems)].length > (elems.length / 2);
    return p1 && p2;
    }

    function isCategoricalColumn(elems) {
    var p1 = [...new Set(elems)].length <= 250;
    var p2 = elems.some(elem => /^\w[\w\s]*$/.test(elem));
    return p1 && p2;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let $data;

    	component_subscribe($$self, data, $$value => { $data = $$value; $$invalidate('$data', $data); });

    	var columns = [];
    var fetchedColumns;

    var selectedColumn;
    function getColourScaleType(column) {
      if (['x', 'y', 'index'].includes(column)) {
        return 'none';
      }

      var elems = $data.map(d => d[column]);

      if (isContinuousColumn(elems)) {
        return 'continuous';
      } else if (isCategoricalColumn(elems)) {
        return 'categorical';
      } else {
        return 'none';
      }
    }
    function fetchColumns() {
      if (($data.length !== 0) && (!fetchedColumns)) {
        $$invalidate('columns', columns = Object.keys($data[0]));
        console.log(columns.map(c => [c, getColourScaleType(c)]));
        $$invalidate('columns', columns = columns.filter(column => getColourScaleType(column) !== 'none'));
        colourBy.set([columns[0], getColourScaleType(columns[0])]);
        $$invalidate('selectedColumn', selectedColumn = columns[0]);
        fetchedColumns = true;
      }
    }
    data.subscribe(() => {
      fetchColumns();
    });

    colourBy.subscribe(value => {
      if (value.length > 0) {
        $$invalidate('selectedColumn', selectedColumn = value[0]);
      }
    });

    	function select_change_handler() {
    		selectedColumn = select_value(this);
    		$$invalidate('selectedColumn', selectedColumn);
    		$$invalidate('columns', columns);
    	}

    	$$self.$$.update = ($$dirty = { selectedColumn: 1 }) => {
    		if ($$dirty.selectedColumn) { colourBy.set([selectedColumn, getColourScaleType(selectedColumn)]); }
    	};

    	return {
    		columns,
    		selectedColumn,
    		select_change_handler
    	};
    }

    class ColourSelect extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, []);
    	}
    }

    var tsv = createCommonjsModule(function (module) {
    (function(){

        var br = "\n";

        function extend (o) {
            Array.prototype.slice.call(arguments, 1).forEach(function(source){
                if (!source) return
                for (var keys = Object.keys(source), i = 0; i < keys.length; i++) {
                    var key = keys[i];
                    o[key] = source[key];
                }
            });
            return o
        }

        function unquote (str) {
            var match;
            return (match = str.match(/(['"]?)(.*)\1/)) && match[2] || str
        }

        function comments (line) {
            return !/#@/.test(line[0])
        }

        function getValues (line, sep) {
            return line.split(sep).map(function(value){
                var value = unquote(value), num = +value;
                return num === parseInt(value, 10) ? num : value
            })
        }

        function Parser (sep, options) {
            var opt = extend({
                header: true
            }, options);

            this.sep = sep;
            this.header = opt.header;
        }

        Parser.prototype.stringify = function (data) {
            var sep    = this.sep
              , head   = !!this.header
              , keys   = (typeof data[0] === 'object') && Object.keys(data[0])
              , header = keys && keys.join(sep)
              , output = head ? (header + br) : '';

            if (!data || !keys) return ''
                
            return output + data.map(function(obj){
                var values = keys.reduce(function(p, key){
                    p.push(obj[key]);
                    return p
                }, []);
                return values.join(sep)
            }).join(br)
        };

        Parser.prototype.parse = function (tsv) {
            var sep   = this.sep
              , lines = tsv.split(/[\n\r]/).filter(comments)
              , head  = !!this.header
              , keys  = head ? getValues(lines.shift(), sep) : {};

            if (lines.length < 1) return []

            return lines.reduce(function(output, line){
                var item = head ? {} : [];
                output.push(getValues(line, sep).reduce(function(item, val, i){
                    item[keys[i] || i] = val;
                    return item
                }, item));
                return output
            }, [])
        };

        // Export TSV parser as main, but also expose `.TSV`, `.CSV` and `.Parser`.
        var TSV = new Parser("\t");

        extend(TSV, {
            TSV    : TSV
          , CSV    : new Parser(",")
          , Parser : Parser
        });

        if ( module.exports){
            module.exports = TSV;
        } else {
            this.TSV = TSV;
        }

    }).call(commonjsGlobal);
    });

    /* static/svelte/DownloadButton.svelte generated by Svelte v3.12.1 */

    function create_fragment$7(ctx) {
    	var label, input, t0, t1, button, dispose;

    	return {
    		c() {
    			label = element("label");
    			input = element("input");
    			t0 = text("\r\nDownload All");
    			t1 = space();
    			button = element("button");
    			button.textContent = "Download TSV";
    			attr(input, "type", "checkbox");
    			attr(label, "class", "svelte-a41zgh");
    			attr(button, "class", "settings-component");

    			dispose = [
    				listen(input, "change", ctx.input_change_handler),
    				listen(button, "click", ctx.downloadFile)
    			];
    		},

    		m(target, anchor) {
    			insert(target, label, anchor);
    			append(label, input);

    			input.checked = ctx.downloadAll;

    			append(label, t0);
    			insert(target, t1, anchor);
    			insert(target, button, anchor);
    		},

    		p(changed, ctx) {
    			if (changed.downloadAll) input.checked = ctx.downloadAll;
    		},

    		i: noop,
    		o: noop,

    		d(detaching) {
    			if (detaching) {
    				detach(label);
    				detach(t1);
    				detach(button);
    			}

    			run_all(dispose);
    		}
    	};
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let $data;

    	component_subscribe($$self, data, $$value => { $data = $$value; $$invalidate('$data', $data); });

    	

    var downloadAll = false;
    function downloadFile() {
        console.log('download');
        var fileLink = window.document.createElement('a');

        var filteredData;
        if (downloadAll) {
          filteredData = $data;
        } else {
          filteredData = $data.filter(d => d.label !== "");
        }

        var tsvData = new Blob([tsv.stringify(filteredData)], {type: 'text/plain'});

        fileLink.href = window.URL.createObjectURL(tsvData);
        fileLink.download = 'cluster_explorer.data.tsv';

        document.body.appendChild(fileLink);
        fileLink.click();
        document.body.removeChild(fileLink);
      }
    	function input_change_handler() {
    		downloadAll = this.checked;
    		$$invalidate('downloadAll', downloadAll);
    	}

    	return {
    		downloadAll,
    		downloadFile,
    		input_change_handler
    	};
    }

    class DownloadButton extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, []);
    	}
    }

    /* static/svelte/Settings.svelte generated by Svelte v3.12.1 */

    function create_fragment$8(ctx) {
    	var div4, center, t1, t2, hr0, t3, div0, t4, t5, hr1, t6, div1, t7, hr2, t8, div2, t9, hr3, t10, div3, t11, hr4, t12, current;

    	var search = new Search({});

    	var checkboxunclustered = new CheckboxUnclustered({});

    	var checkboxlabels = new CheckboxLabels({});

    	var colourselect = new ColourSelect({});

    	var lassotoggle = new LassoToggle({});

    	var downloadbutton = new DownloadButton({});

    	var descriptionbox = new DescriptionBox({});

    	return {
    		c() {
    			div4 = element("div");
    			center = element("center");
    			center.innerHTML = `<h3>Cluster Explorer</h3>`;
    			t1 = space();
    			search.$$.fragment.c();
    			t2 = space();
    			hr0 = element("hr");
    			t3 = space();
    			div0 = element("div");
    			checkboxunclustered.$$.fragment.c();
    			t4 = space();
    			checkboxlabels.$$.fragment.c();
    			t5 = space();
    			hr1 = element("hr");
    			t6 = space();
    			div1 = element("div");
    			colourselect.$$.fragment.c();
    			t7 = space();
    			hr2 = element("hr");
    			t8 = space();
    			div2 = element("div");
    			lassotoggle.$$.fragment.c();
    			t9 = space();
    			hr3 = element("hr");
    			t10 = space();
    			div3 = element("div");
    			downloadbutton.$$.fragment.c();
    			t11 = space();
    			hr4 = element("hr");
    			t12 = space();
    			descriptionbox.$$.fragment.c();
    			attr(div0, "class", "checkbox-container svelte-17058de");
    			attr(div1, "class", "colour-container svelte-17058de");
    			attr(div2, "class", "lasso-container svelte-17058de");
    			attr(div3, "class", "download-container svelte-17058de");
    			attr(div4, "class", "settings svelte-17058de");
    		},

    		m(target, anchor) {
    			insert(target, div4, anchor);
    			append(div4, center);
    			append(div4, t1);
    			mount_component(search, div4, null);
    			append(div4, t2);
    			append(div4, hr0);
    			append(div4, t3);
    			append(div4, div0);
    			mount_component(checkboxunclustered, div0, null);
    			append(div0, t4);
    			mount_component(checkboxlabels, div0, null);
    			append(div4, t5);
    			append(div4, hr1);
    			append(div4, t6);
    			append(div4, div1);
    			mount_component(colourselect, div1, null);
    			append(div4, t7);
    			append(div4, hr2);
    			append(div4, t8);
    			append(div4, div2);
    			mount_component(lassotoggle, div2, null);
    			append(div4, t9);
    			append(div4, hr3);
    			append(div4, t10);
    			append(div4, div3);
    			mount_component(downloadbutton, div3, null);
    			append(div4, t11);
    			append(div4, hr4);
    			append(div4, t12);
    			mount_component(descriptionbox, div4, null);
    			current = true;
    		},

    		p: noop,

    		i(local) {
    			if (current) return;
    			transition_in(search.$$.fragment, local);

    			transition_in(checkboxunclustered.$$.fragment, local);

    			transition_in(checkboxlabels.$$.fragment, local);

    			transition_in(colourselect.$$.fragment, local);

    			transition_in(lassotoggle.$$.fragment, local);

    			transition_in(downloadbutton.$$.fragment, local);

    			transition_in(descriptionbox.$$.fragment, local);

    			current = true;
    		},

    		o(local) {
    			transition_out(search.$$.fragment, local);
    			transition_out(checkboxunclustered.$$.fragment, local);
    			transition_out(checkboxlabels.$$.fragment, local);
    			transition_out(colourselect.$$.fragment, local);
    			transition_out(lassotoggle.$$.fragment, local);
    			transition_out(downloadbutton.$$.fragment, local);
    			transition_out(descriptionbox.$$.fragment, local);
    			current = false;
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(div4);
    			}

    			destroy_component(search);

    			destroy_component(checkboxunclustered);

    			destroy_component(checkboxlabels);

    			destroy_component(colourselect);

    			destroy_component(lassotoggle);

    			destroy_component(downloadbutton);

    			destroy_component(descriptionbox);
    		}
    	};
    }

    function instance$8($$self) {

    	return {};
    }

    class Settings extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, []);
    	}
    }

    /* static/svelte/App.svelte generated by Svelte v3.12.1 */

    function create_fragment$9(ctx) {
    	var div, t, current;

    	var scatter = new Scatter({});

    	var settings = new Settings({});

    	return {
    		c() {
    			div = element("div");
    			scatter.$$.fragment.c();
    			t = space();
    			settings.$$.fragment.c();
    			attr(div, "class", "grid-container svelte-7vqjzq");
    		},

    		m(target, anchor) {
    			insert(target, div, anchor);
    			mount_component(scatter, div, null);
    			append(div, t);
    			mount_component(settings, div, null);
    			current = true;
    		},

    		p: noop,

    		i(local) {
    			if (current) return;
    			transition_in(scatter.$$.fragment, local);

    			transition_in(settings.$$.fragment, local);

    			current = true;
    		},

    		o(local) {
    			transition_out(scatter.$$.fragment, local);
    			transition_out(settings.$$.fragment, local);
    			current = false;
    		},

    		d(detaching) {
    			if (detaching) {
    				detach(div);
    			}

    			destroy_component(scatter);

    			destroy_component(settings);
    		}
    	};
    }

    function instance$9($$self) {
    	

      onMount(async () => {
        var dataUrl = `http://95.216.141.17:5003/client/static/data/${token}/scatter.csv`;
        fetch(dataUrl)
          .then(d => d.text())
          .then(d => papaparse_min.parse(d, {header: true, skipEmptyLines: true})['data'])
          .then(d => {for (var i in d) {d[i]['index'] = parseInt(i);} return d})
          .then(d => {data.set(d);})
          .catch(err => {console.log(err);});

        var labelsUrl = `http://95.216.141.17:5003/client/static/data/${token}/labels.csv`;
        fetch(labelsUrl)
          .then(d => d.text())
          .then(d => papaparse_min.parse(d, {header: true, skipEmptyLines: true})['data'])
          .then(d => {labels.set(d);})
          .catch(err => {console.log(err);});
      });

    	return {};
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, []);
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
