/* backbone-nestify 0.2.0 2013-12-18
 * http://revelytix.github.io/backbone-nestify/
 * Copyright 2013 Revelytix, Inc. All rights reserved. */
/**
 * A mixin for models with nested models; overrides 'get' and 'set'
 * methods, deals properly with getting/setting raw attributes 
 * from/into the proper nested models.
 */
(function (factory){
    // node
    if (typeof module === 'object') {
        module.exports = factory(
            require('underscore'), 
            require('backbone'));
    // require.js
    } else if (typeof define === 'function' && define.amd) {
        define( [
            "underscore",
            "backbone"
        ], factory);
    } else {
        // globals
        this.nestify = factory(this._, this.Backbone);
    }
}(function(_, Backbone) {

    /**
     * Returns false for null or undefined, true for everything
     * else.
     * (by @fogus)
     */
    var existy = function(x){
        /*
         * Important here to use '!=' rather than '!==', so that
         * undefined values will be coerced and correctly reported
         * as not existy.
         */
        return x != null;
    };

    /**
     * Default options; currently these are to control the behavior of
     * nested collections.
     */
    var _defaultOpts = {
        coll: "at", // possible values are "reset", "set", "at"
        delim: "|" // default delimiter is a pipe character
    };

    /**
     * Looks up the proper nested Backbone Model or Collection,
     * based on the path represented by the keys array. Numbers
     * are interpreted as indices into a Collection, otherwise the
     * String value is interpreted as an attribute of a nested
     * Model.
     * @param keys array of Strings and or Ints, representing a
     * path to a nested attribute.
     * @param model Backbone.Model to begin the search with
     * @return undefined if nothing found for that path.
     */
    var _lookup_path = function(keys, model){

        return _.reduce(keys, function(m, k){
            var nextM;

            if(m) {

                if (_.isNumber(k)){
                    nextM = (m instanceof Backbone.Collection ? m.at(k) : m[k]);
                } else {
                    nextM = (m instanceof Backbone.Model ? m.attributes[k] : m[k]);
                }

                /*if (!nextM && (k !== _.last(keys))){
                 // attr not found at path; log to help diagnose
                 console.log("**WARNING** no attribute at key '" + k + "' of path '" + keys + "' for model\n" + model.dbg());
                 }*/
            }

            return nextM;
        }, model);
    };

    /**
     * Given an array of Strings, return an array with the same
     * contents, only with any numbers converted into proper Integers.
     */
    var _withProperNums = function(keys){
        return _.map(keys, function(value){
            var mn = parseInt(value, 10); 
            return (_.isNaN(mn) ? value : mn);
        });
    };

    /**
     * If the property key is a delimited string such as
     * <code>'foo|bar|0|baz'</code>
     * then return an array of Strings, converting any String
     * numbers into proper Integers:
     * <code>['foo', 'bar', 0, 'baz']
     */
    var _delimitedStringToArray = function(key, opts){
        var _delim = opts.delim;
        return (_.isString(key) && key.indexOf(_delim) > -1) ? _withProperNums(key.split(_delim)) : key;
    };

    /**
     * Converts a path of key(s) and a value to Object
     * form. Nested simple objects and/or arrays will be created
     * as necessary.
     * 
     * Example:
     *
     * <code>
     * _toObj(["foo", 2, "bar"], "baz");
     * </code>
     * returns
     * <code>
     * {foo: [undefined, undefined, {bar: "baz}]}
     * </code>
     * note the nested array and object are created automatically
     *
     * @param path may be a
     * (1) simple String
     * (2) array of Strings or Ints
     * (3) object other than an array
     * @param value a simple value (not an object or array)
     * @return 
     * if path is (1) return {path: value}
     * if path is (2) build up Object
     * if path is (3), return path unmodified
     */
    var _toObj = function(path, value){
        var result;
        if (_.isObject(path) && !(_.isArray(path))){
            result = path;
        } else if ((_.isArray(path) || _.isString(path))){

            // wrap single string in array, if necessary
            path = (_.isArray(path) ? path : [path]);

            /** 
             * Build up result object by traversing array from
             * right-to-left; start by pairing the value with the
             * path from the rightmost array slot. If 'key' is a
             * number, create a new array, otherwise create a new
             * object.
             */
            result = _.reduceRight(path, function(obj, key){
                var newObj;
                if (_.isNumber(key)){
                    newObj = [];
                } else {
                    newObj = {};
                }
                newObj[key] = obj;
                return newObj;
            }, value);
        }
        return result;
    };

    var _assertArray = function(a){
        // TODO proper assert
        if (!(_.isArray(a))){
            console.log("**WARNING**! expected array but found: " + JSON.stringify(a));
        }
    };

    /**
     * Group nested Collection-related functions together.
     */
    var _collection = {
        /**
         * Create new Models from the indicated Collection Model, and
         * 'reset' them on the Collection
         * @param coll Backbone.Collection which is to be reset with
         * new models
         * @param atts raw Object which is to be used to instantiate new
         * Models to 'reset' to the Collection
         * @param opts (optional) options to the Model constructor and
         * Collection 'reset' method.
         */
        reset: function(coll, atts, opts){
            _assertArray(atts);
            var Constructor = coll.model;
            coll.reset(_.map(atts, function(att){
                return new Constructor(att, opts);
            }), opts);
        },

        /**
         * Create new Models from the indicated Collection Model, and
         * intelligently merge them in to the Collection.
         * @param coll Backbone.Collection which is to be merged with
         * new models
         * @param atts raw Object which is to be used to instantiate new
         * Models to add to the Collection
         * @param opts (optional) options to the Model constructor
         * or Model 'set' method
         */
        set: function(coll, atts, opts){
            _assertArray(atts);
            var Constructor = coll.model;
            coll.set(_.map(atts, function(att){
                return new Constructor(att, opts);
            }), opts);
        },

        /**
         * Default behavior, update nested collection index-based.
         * (Doesn't really use 'at' function, currently.)
         */
        setAt: function(coll, atts, opts){
            _assertArray(atts);
            var Constructor = coll.model;
            var alist = _.zip(coll.models, atts);
            _.each(alist, function(pair, i){

                var m = _.first(pair);
                var att = _.last(pair);

                if (att){
                    if (!m){
                        m = new Constructor(att, opts);
                        /* Note that this may fill the models
                         * array sparsely, perhaps unexpectedly. */
                        coll.models[i] = m;
                        coll.length = coll.models.length;
                    } else {
                        m.set(att, opts);
                    }
                }
            });
        }
    };

    /**
     * Matchers. Functions are predicates (return true or false) and
     * take the following parameters:
     * 1. the String attribute name
     * 2. the value to be set (may be null or undefined)
     * 3. the existing value for that attribute (may be null or undefined)
     * 4. the options hash
     */
    var _matchers = {

        /**
         * Needs to be partially invoked, providing the 'str' arg
         */
        stringMatcher: function(str, attr){
            return str === attr;
        },

        /**
         * Needs to be partially invoked, providing the 'regex' arg
         */
        regexMatcher: function(regex, attr){
            return regex.test(attr);
        },

        matchAll: function(){
            return true;
        },

        /**
         * This predicate indicates the input value should not be 
         * modified by this plugin. Currently: if the value is already
         * a Backbone Model or Collection, or if 'clear' or 'unset' is
         * occurring.
         */
        useUnmodified: function(att, v, existing, opts){
            return (v instanceof Backbone.Model ||
                    v instanceof Backbone.Collection ||
                    (opts.unset && !existy(v)));
        },

        isModel: function(att, v){
        },

        isCollection: function(att, v){
        },

        isArray: function(att, v){
            return _.isArray(v);
        },
       
        isObject: function(att, v){
            return _.isObject(v);
        }
    };

    /**
     * Group together nest-related functions.
     * TODO reword following paragraph:
     * A 'nest' is a function which produces a container type to be set at a
     * given Model or Collection attribute, according to the nestify
     * spec. It's intended to be a Backbone Model or Container
     * instance of some type, either a new instance or a modified
     * existing one; or even just a native JavaScript Object or Array
     */
    var _nest = {

        /**
         * Iterate through the list of specs; return the 'nest' fn of the
         * first one that is a match for the indicated attribute.
         * @param specs compiled list of specs
         * @param attName String attribute name which may be specified
         * to be paired with a nested container of some sort
         * @param val value at attribute 'attName'; possibly a
         * container of some sort. Possibly null or undefined.
         * @param existing value at attribute 'attName'; possibly a
         * container of some sort
         * @param opts the usual opts to Backbone or this plugin
         * @return the matched container nest function
         */
        findNestFn: function(specs, attName, val, existing, opts){
            var match = _.find(specs, function(spec){
                return spec._matcherFn(attName, val, existing, opts);
            });
            return match ? match._nestFn : _.bind(this.notSpecked, this);
        },

        /**
         * Returns a nest function which will produce a container for
         * nesting.
         * @param spec 'nest' spec: the part of the nestify spec which
         * specifies how to produce a container for nesting.
         * @return a function which produces a container to be set for an
         * attribute. The function takes these args: 
         * 1. the unmodified container being set
         * 2. the existing container (may be null or undefined)
         * 3. the options hash
         * 4. the String attribute name
         * 5. the Backbone Model
         */
        makeNestFn: function(spec){
            var nestFn;

            if (_.isFunction(spec.fn)) {
                nestFn = spec.fn;
            } else {
                spec = _.isFunction(spec) ? {constructor:spec} : spec;
                // Thunkify creation of new container; it may not be needed
                nestFn = _.partial(this.specked, function(opts){
                    var container = new spec.constructor(spec.args);
                    /* Here's where that undocumented flag gets detected. */
                    if (spec.spec === "recurse"){
                        _.extend(container, opts.compiled);
                    } else if (spec.spec){
                        _.extend(container, mixinFn(spec.spec));
                    }
                    return container;
                });
            }

            return nestFn;
        },

        /**
         * Nested Backbone Model or Constructor case.
         */
        specked: function(thunk, v, existing, options){
            // Either reuse the nested container, if
            // present, or realize the new nested instance from 
            // the thunk.
            var container = existing || thunk(options);

            // TODO Backbone.Collection has a 'set' method in
            // Backbone 1.0.0; just use 'reset' for now.
            if (container.reset){// It's a Backbone.Collection
                if (existing){
                    switch (options.coll){
                    case "reset":
                        _collection.reset(container, v, options);
                        break;
                    case "set":
                        _collection.set(container, v, options);
                        break;
                    case "at":
                        /* jshint -W086 */
                    default:
                        _collection.setAt(container, v, options);
                        break;
                    }
                } else {
                    _collection.reset(container, v, options);
                }
            } else {// It's a Backbone.Model
                container.set(v, options);
            }

            return container;
        },

        /**
         * There is no spec for the attribute. Therefore, do default
         * nesting: if existing container is an array or object, add to
         * it. Otherwise return the new container;
         * DEPRECATED TODO remove
         */
        notSpecked: function(container, existing){
            var newContainer = container;
            if (existing){
                if (_.isArray(existing)){
                    newContainer = this.overlayArray(container, existing);
                } else if (_.isObject(existing)){
                    newContainer = this.overlayObject(container, existing);
                }
            } 
            return newContainer;
        },

        /**
         * Overlay the contents of the new 'container' Object into the
         * contents of the 'existing' Object.
         */
        overlayObject: function(container, existing){
            return _.extend({}, existing, container);
        },

        /**
         * Overlay the contents of the new 'container' array into the
         * contents of the 'existing' array.
         */
        overlayArray: function(container, existing){
            return _.map(_.zip(container, existing), _.compose(_.first, _.compact));
        }
    };

    /**
     * The input 'setAttributes' is an Object; reduce over it to
     * produce an equivalent Object with existing nested Backbone
     * Models or other objects in the right places.
     * @param this a Backbone.Model having this mixin
     * @param spec currently, a hash of String model
     * attribute names, mapped to the constructor which must be
     * used to instantiate a new nested Backbone model for that
     * attribute. (see Example Usage doc)
     * @param setAttributes the raw input Object which is to be
     * transformed and made ready to be set on the model
     * @param opts (optional) options to the 'set' method
     * @return prepared 'set attributes' ready to be set on the
     * Backbone model
     */ 
    var _prepAttributes  = function(spec, setAttributes, opts){

        opts = opts || {};

        /**
         * The input 'setAttributes' is unmodified input; reduce over it to
         * produce an equivalent object with existing nested backbone
         * models or other objects in the right places. Then set that on 
         * the model.
         */ 
        setAttributes = _.reduce(setAttributes, function(preppedAtts, v, k){

            var existing = (this.attributes && this.attributes[k]),
                nestFn = _nest.findNestFn(spec, k, v, existing, opts);
            preppedAtts[k] = nestFn(v, existing, opts, k, this);

            return preppedAtts;
        }, {}, this);

        return setAttributes;
    };

    /**
     * Group compiler related things together
     */
    var _compiler = {

        /**
         * Produces an internally optimized version of the spec.
         * Currently: a list of matcher/nest function pairs. 
         * @param spec input to API
         * @param opts usual Backbone and/or Nestify options
         * @return array of objects containing two attributes:
         * '_matcherFn' and '_nestFn'.
         */
        compileSpec: function(spec, opts){

            var specList, 
                compiled;

            if (_.isArray(spec)){
                specList = spec;
            } else if (_.isObject(spec)){
                specList = [{hash: spec}];
            } else {
                specList = [];
            }

            compiled = [{
                _matcherFn: _matchers.useUnmodified,
                _nestFn: _.identity
            }];

            compiled = _.reduce(specList, function(memo, specPiece){
                
                if (specPiece.hash){
                    _.each(specPiece.hash, function(v, k){
                        memo.push({
                            _matcherFn: _.partial(_matchers.stringMatcher, k),
                            _nestFn: _nest.makeNestFn(v)
                        });
                    });

                } else { 

                    var result = {
                        _nestFn: _nest.makeNestFn(specPiece.nest)
                    };

                    if (_.isRegExp(specPiece.match)){
                        result._matcherFn = _.partial(_matchers.regexMatcher, specPiece.match);
                    } else if (_.isString(specPiece.match)){
                        result._matcherFn = _.partial(_matchers.stringMatcher, specPiece.match);
                    } else if (_.isFunction(specPiece.match)){
                        result._matcherFn = specPiece.match;
                    } else {
                        // no matcher specified means match all
                        result._matcherFn = _matchers.matchAll;
                    }

                    memo.push(result);
                }


                return memo;
            }, compiled);

            // stash the compiled spec in the opts
            opts.compiled = compiled;
            return compiled;
        }
    };


    /**
     * Return the module: a function which must be invoked to
     * produce the mixin.
     *
     * @param spec specification - a hash of String attribute name
     * to object containing a nested model constructor
     * constructor function and optional args
     * which will create a new instance of a nested model for
     * storing that attribute.
     *
     * @param options Backbone and/or Nestify options
     *
     * Example usage - no spec
     * 
     * <code><pre> 
     * nestify();
     * </pre></code>
     *
     * Example usage - no args passed to nested model constructor:
     * 
     * <code><pre> 
     * nestify(
     *   {'fooAttribute':
     *     {constructor: FooNestedModel}
     *   });
     * </pre></code>
     *
     * Example usage - with additional args to nested model constructor:
     * 
     * <code><pre> 
     * nestify(
     *   {'fooAttribute':
     *     {constructor: FooNestedModel,
     *      args: {whatever: 'yadda yadda'}}
     *   });
     * </pre></code>
     *
     */
    var mixinFn = _.extend(function(spec, options){

        var _moduleOpts = _.extend({}, _defaultOpts, options),
            _prepAtts = _.partial(_prepAttributes, _compiler.compileSpec(spec, _moduleOpts));

        return {
            /**
             * Dopified 'get' method: handles nested model. Allows, as a
             * convenience, a syntax to get values from nested models:
             *
             * m.get(["foo/Attr", "nestedFoo/Attr", 1, "nestedBaz/Attr"]);
             *
             * or alternate delimited String syntax:
             *
             * m.get("foo/Attr|nestedFoo/Attr|1|nestedBaz/Attr");
             * 
             * Strings point to nested Models, integers point to nested
             * Collections.
             */
            get: function(keys, opts){
                opts = _.extend({}, _moduleOpts, opts);
                keys = _delimitedStringToArray(keys, opts);
                if (_.isArray(keys)){
                    return _lookup_path(keys, this);
                } else {
                    return Backbone.Model.prototype.get.apply(this, arguments);
                }
            },

            /**
             * Dopified 'set' method: handles nested model. Allows, as a
             * convenience, a syntax to set values on nested models:
             *
             * m.set(["foo/Attr", "nestedFoo/Attr", 2, "keyToSet"], "valueToSet);
             * 
             * or alternate delimited String syntax:
             *
             * m.set("foo/Attr|nestedFoo/Attr|2|keyToSet", "valueToSet);
             *
             * Strings point to nested Models, integers point to nested
             * Collections.
             */
            set: function(keys, value, opts){

                var attrs;
                if (!_.isArray(keys) && _.isObject(keys)) {
                    opts = _.extend({}, _moduleOpts, value);
                    attrs = keys instanceof Backbone.Model ? keys.attributes : keys;
                } else {
                    opts = _.extend({}, _moduleOpts, opts);
                    keys = _delimitedStringToArray(keys, opts);
                    attrs = _toObj(keys, value);
                }

                /**
                 * Skip the case of a simple key/value pair being
                 * passed in, or the case that value is already a Backbone.Model
                 */
                if (_.isObject(attrs) && !(opts instanceof Backbone.Model)){
                    attrs = _prepAtts.call(this, attrs, opts);
                }

                return Backbone.Model.prototype.set.call(this, attrs, opts);
            }
        };
    }, {

        /**
         * alpha: subject to change
         * Auto-nestify: automatically nest into Backbone Models and
         * Collections without explicit specification.
         * @param opts the usual
         * @return a mixin (as if calling nestify() per usual)
         */
        auto:function(opts){

            // private, anonymous subtypes
            var M = Backbone.Model.extend(),
                C = Backbone.Collection.extend({model:M});

            /* 
             * Use this undocumented flag to indicate using the spec
             * recursively.
             */
            var flag = "recurse";

            var spec = [{
                match: _matchers.isArray,
                nest: C
            },{
                match: _matchers.isObject,
                nest: {
                    constructor: M,
                    spec: flag
                }
            }];

            var compiled = mixinFn(spec, opts);

            // Mix the compiled spec into our anonymous Model subclass
            _.extend(M.prototype, compiled);

            return compiled;
        }
    });

    // for testing purposes
    mixinFn.pathToObject = _toObj;

    return mixinFn;
}));
