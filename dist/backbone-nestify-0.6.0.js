/* backbone-nestify 0.6.0 2015-08-14
 * http://revelytix.github.io/backbone-nestify/
 * Copyright 2015 Teradata, Inc. All rights reserved. */
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


    var _slice = Array.prototype.slice;

    var _core = {

        /**
         * Returns false for null or undefined, true for everything
         * else.
         * (by @fogus)
         */
        existy: function(x){
            /*
             * Important here to use '!=' rather than '!==', so that
             * undefined values will be coerced and correctly reported
             * as not existy.
             */
            return x != null;
        },

        /**
         * Default options
         */
        defaultOpts: {
            coll: "at", // possible values are "reset", "set", "at"
            delim: "|" // default delimiter is a pipe character
        },

        /**
         * Looks up the proper nested Backbone Model or Collection,
         * based on the path represented by the keys array. Numbers
         * are interpreted as indices into a Collection, otherwise the
         * String value is interpreted as an attribute of a nested
         * Model.
         * @param keys array of Strings and or Ints, representing a
         * path to a nested attribute.
         * @param model Backbone.Model to begin the search with
         * @return model, or undefined if nothing found for that path.
         */
        lookupPath: function(keys, model){
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
        },

        properNum: function(value){
            return (/^([0-9]+)$/.test(value)) ? parseInt(value, 10) : value;
        },

        /**
         * Given an array of Strings, return an array with the same
         * contents, only with any numbers converted into proper Integers.
         */
        withProperNums: function(keys){
            return _.map(keys, _core.properNum);
        },

        /**
         * If the property key is a delimited string such as
         * <code>'foo|bar|0|baz'</code>
         * then return an array of Strings, converting any String
         * numbers into proper Integers:
         * <code>['foo', 'bar', 0, 'baz']
         * @param key (optional) String, Stringified array, or array of Strings
         * @param opts may contain a <code>delim</code>
         * @return array of zero or more Strings
         */
        delimitedStringToArray: function(key, opts){
            var _delim = opts.delim;

            if (!_core.existy(key)){
                return [];
            } else if (_.isArray(key)){
                return key;
            } else if (_.isString(key) && key.indexOf(_delim) > -1) {
                return _core.withProperNums(key.split(_delim));
            } else {
                // it's a single String
                return [key];
            }
        },

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
        toObj: function(path, value){
            var result;
            if (_.isObject(path) && !(_.isArray(path))){
                result = path;
            } else if ((_.isArray(path) || _.isString(path))){

                // wrap single string in array, if necessary TODO remove and tests
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
        },

        /** coerce null or undefined to an empty array */
        coerceArray: function(a){
            if (!_core.existy(a)){
                a = [];
            }
            return a;
        },

        assertArray: function(a){
            // TODO proper assert
            if (!(_.isArray(a))){
                console.log("**WARNING**! expected array but found: " + JSON.stringify(a));
            }
        },

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
        prepAttributes: function(spec, setAttributes, opts){

            opts = opts || {};

            /**
             * The input 'setAttributes' is unmodified input; reduce over it to
             * produce an equivalent object with existing nested backbone
             * models or other objects in the right places. Then set that on 
             * the model.
             */ 
            setAttributes = _.reduce(setAttributes, function(preppedAtts, v, k){

                var existing = (this.attributes && this.attributes[k]),
                    containerFn = _container.findContainerFn(spec, k, v, existing, opts);
                preppedAtts[k] = containerFn(v, existing, opts, k, this);

                return preppedAtts;
            }, {}, this);

            return setAttributes;
        },


        /**
         * Utility to do deep (nested) check of 'hasChanged' method.
         * Looks for nested Models or Collections of Models.
         * @param hasChangedDeep a reference to this function, for
         * calling itself recursively
         * @param checkDeep boolean whether or not to recurse
         * @param attr (optional) arg to 'hasChanged' method.
         */
        hasChangedDeep: function(hasChangedDeep, checkDeep, attr){
            var didChange = Backbone.Model.prototype.hasChanged.call(this, attr);

            // Do the recursive check, if necessary
            if (!didChange && checkDeep){
                didChange = _.reduce(this.attributes, function(didChg, a, idx){
                    if (!didChg) {
                        if (a instanceof Backbone.Model){
                            didChg = hasChangedDeep.call(a, hasChangedDeep, checkDeep);
                        } else if (a instanceof Backbone.Collection){
                            didChg = a.reduce(function(didChg, m){
                                return didChg || hasChangedDeep.call(m, hasChangedDeep, checkDeep);
                            }, didChg);
                        }
                    }
                    return didChg;
                }, didChange);
            }

            return didChange;

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
            return (this.isModel(att, v) ||
                    this.isCollection(att, v) ||
                    (opts.unset && !_core.existy(v)));
        },

        isModel: function(att, v){
            return v instanceof Backbone.Model;
        },

        isExistingModel: function(att, v, existing){
            return existing instanceof Backbone.Model;
        },

        isCollection: function(att, v){
            return v instanceof Backbone.Collection;
        },

        isExistingCollection: function(att, v, existing){
            return existing instanceof Backbone.Collection;
        },

        isArray: function(att, v){
            return _.isArray(v);
        },
       
        isArrayOfObjects: function(att, v){
            return _.isArray(v) && _.every(v, _.isObject);
        },
       
        isExistingArray: function(att, v, existing){
            return _.isArray(existing);
        },
       
        isObject: function(att, v){
            return _.isObject(v);
        },

        isExistingObject: function(att, v, existing){
            return _.isObject(existing);
        },

        /**
         * compose matcher functions together into a single matcher
         * function that "and"'s them all.
         */
        and: function(){
            var fns = _slice.call(arguments);
            return function(){
                var args = _slice.call(arguments);
                return _.reduce(fns, function(result, fn){
                    return (result && fn.apply(this, args));
                }, true, this);
            };
        },

        /**
         * compose matcher functions together into a single matcher
         * function that "or"'s them all.
         */
        or: function(){
            var fns = _slice.call(arguments);
            return function(){
                var args = _slice.call(arguments);
                return _.reduce(fns, function(result, fn){
                    return (result || fn.apply(this, args));
                }, false, this);
            };
        },

        /**
         * Return a matcher function that is the negation of the
         * supplied matcher function.
         */
        not: function(fn){
            return function(){
                return !fn.apply(this, arguments);
            };
        }
    };
    _.bindAll(_matchers, "useUnmodified");

    /**
     * Group together container-related functions.
     */
    var _container = {

        determineType: function(value){
            
            var result;
            if (value instanceof Backbone.Model) {
                result = "model";
            } else if (value instanceof Backbone.Collection) {
                result = "collection";
            } else if (_.isArray(value)) {
                result = "array";
            } else if (_.isObject(value)) {
                result = "object";
            } 
            return result;
        },

        /** true if Model or Collection; false otherwise */
        isBackbone: function(type){
            return _.contains(["model", "collection"], type);
        },

        /**
         * Iterate through the list of specs; return the 'container' fn of the
         * first one that is a match for the indicated attribute.
         * @param specs compiled list of specs
         * @param attName String attribute name which may be specified
         * to be paired with a nested container of some sort
         * @param val value at attribute 'attName'; possibly a
         * container of some sort. Possibly null or undefined.
         * @param existing value at attribute 'attName'; possibly a
         * container of some sort
         * @param opts the usual opts to Backbone or this plugin
         * @return the matched container function
         */
        findContainerFn: function(specs, attName, val, existing, opts){
            var match = _.find(specs, function(spec){
                return spec._matcherFn(attName, val, existing, opts);
            });
            return match._containerFn;
        },

        object: {
            /**
             * Overlay the contents of the new 'container' Object into the
             * contents of the 'existing' Object.
             */
            merge: function(existing, container){
                return _.extend({}, existing, container);
            },

            /** resetting an Object or Array => return the new container */
            reset: function(existing, container){
                return container;
            }
        },

        array: {
            /**
             * Overlay the contents of the new 'container' array into the
             * contents of the 'existing' array.
             */
            merge: function(existing, container){
                return _.map(_.zip(container, existing), _.compose(_.first, _.compact));
            },

            /** resetting an Object or Array => return the new container */
            reset: function(existing, container){
                return container;
            }
        },

        model: {
            merge: function(existing, v, opts){
                existing.set(v, opts);
                return existing;
            },

            reset: function(existing, v, opts){
                existing.clear();
                existing.set(v, opts);
                return existing;
            }
        },

        collection: {
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
                atts = _core.coerceArray(atts);
                _core.assertArray(atts);
                var Constructor = coll.model;
                coll.reset(_.map(atts, function(att){
                    return new Constructor(att, opts);
                }), opts);
                return coll;
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
            smartMerge: function(coll, atts, opts){
                atts = _core.coerceArray(atts);
                _core.assertArray(atts);
                var Constructor = coll.model;
                coll.set(_.map(atts, function(att){
                    return new Constructor(att, opts);
                }), opts);
                return coll;
            },

            /**
             * Default behavior, update nested collection index-based.
             */
            merge: function(coll, atts, opts){
                atts = _core.coerceArray(atts);
                _core.assertArray(atts);
                var Constructor = coll.model;
                var alist = _.zip(coll.models, atts);
                var ms = _.map(alist, function(pair) {
                    var existingModel = pair[0],
                        updateAtts = pair[1],
                        result = existingModel;

                    if (updateAtts){
                        if (existingModel){
                            existingModel.set(updateAtts, opts);
                        } else {
                            result = new Constructor(updateAtts, opts);
                        }
                    }
                    return result;
                });
                coll.set(ms, opts);
                return coll;
            }
        }
    };

    var _updater = {

        defaults: {
            object: "reset",
            array: "reset",
            collection: "merge",
            model: "merge"
        },

        object: {
            reset: _container.object.reset,
            merge: _container.object.merge,
            smart: _container.object.merge
        },

        array: {
            reset: _container.array.reset,
            merge: _container.array.merge,
            smart: _container.array.merge
        },

        model: {
            reset: _container.model.reset,
            merge: _container.model.merge,
            smart: _container.model.merge
        },

        collection: {
            reset: _container.collection.reset,
            merge: _container.collection.merge,
            smart: _container.collection.smartMerge
        }
    };


    /**
     * Produces an internally optimized version of the spec.
     */
    var _compiler = {

        /**
         * Determine the type of container (if any) specified by
         * 'spec'
         * @param constructor a container constructor function
         * @return String indication of container type, or undefined.
         */
        determineTypeFromConstructor: function(constructor){
            
            var result;
            if (constructor === Backbone.Model ||
                constructor.prototype instanceof Backbone.Model) {
                result = "model";
            } else if (constructor === Backbone.Collection ||
                       constructor.prototype instanceof Backbone.Collection) {
                result = "collection";
            } else if (constructor === Array) {
                result = "array";
            } else if (constructor === Object) {
                result = "object";
            } 
            return result;
        },

        /**
         * Compiles and returns a constructor function - a function
         * which, when invoked, returns a newly-constructed container.
         */
        compileConstructorFn: function(spec, type){
            var invokeWithNew = _core.existy(type),
                isBackbone = _container.isBackbone(type);

            // Thunkify construction of new container; it may not be needed
            return function(v, opts, att, m){
                //TODO array of args?
                var container = invokeWithNew ? 
                        isBackbone ?
                        new spec.constructor(spec.args, opts) : 
                        new spec.constructor() :
                        spec.constructor(spec.args, opts, att, m); 

                if (spec.spec){
                    _.extend(container, mixinFn(spec.spec));
                } 

                return container;
            };
            
        },

        /**
         * Returns a function which will produce a container for
         * nesting.
         * @param spec 'container' spec: the part of the nestify spec which
         * specifies how to produce a container for nesting.
         * @return a function which produces a container to be set for an
         * attribute. The function takes these args: 
         * 1. the unmodified container being set
         * 2. the existing container (may be null or undefined)
         * 3. the options hash
         * 4. the String attribute name
         * 5. the Backbone Model
         */
        compileContainerFn: function(spec){

            spec = _.isFunction(spec) ? {constructor:spec} : spec;

            var containerType = this.determineTypeFromConstructor(spec.constructor),
                constructorFn = this.compileConstructorFn(spec, containerType);

            return function(v, existing, options/*, att, m*/){
                options = spec.opts ? _.extend({}, options, spec.opts) : options;
                var container = existing ? existing : constructorFn(v, options);
                containerType = containerType || _container.determineType(container);
                // TODO log warning if containerType still falsey at this point
                var update = options.update || _updater.defaults[containerType],
                    updaterHash = _updater[containerType];
                return updaterHash[update](container, v, options);
            };
        },

        compileExistingContainerFn: function(type){
            var updaterHash = _updater[type],
                defaultUpdater = _updater.defaults[type];
            return function(v, existing, options/*, att, m*/){
                var update = options.update || defaultUpdater;
                return updaterHash[update](existing, v, options);
            };
        },

        /**
         * Produces an internally optimized version of the spec.
         * Currently: a list of matcher/container function pairs. 
         * @param spec input to API
         * @param opts usual Backbone and/or Nestify options
         * @return array of objects containing two attributes:
         * '_matcherFn' and '_containerFn'.
         */
        compile: function(spec, opts){
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
                _containerFn: _.identity
            }];

            compiled = _.reduce(specList, function(memo, specPiece){
                
                if (specPiece.hash){
                    _.each(specPiece.hash, function(v, k){
                        memo.push({
                            _matcherFn: _.partial(_matchers.stringMatcher, k),
                            _containerFn: this.compileContainerFn(v)
                        });
                    }, this);

                } else { 

                    var result = {
                        _containerFn: this.compileContainerFn(specPiece.container)
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
            }, compiled, this);

            // fall thru: handle unspecified, existing containers
            compiled.push({
                _matcherFn: _matchers.isExistingCollection,
                _containerFn: this.compileExistingContainerFn("collection")
            }, {
                _matcherFn: _matchers.isExistingModel,
                _containerFn: this.compileExistingContainerFn("model")
            }, {
                _matcherFn: _matchers.isExistingArray,
                _containerFn: this.compileExistingContainerFn("array")
            }, {
                _matcherFn: _matchers.isExistingObject,
                _containerFn: this.compileExistingContainerFn("object")
            });

            // final fall thru: handle any non-specified, non-container attribute
            compiled.push({
                _matcherFn: _matchers.matchAll,
                _containerFn: _.identity
            });

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

        var _moduleOpts = _.extend({}, _core.defaultOpts, options);
        spec = _compiler.compile(spec, _moduleOpts);

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
                keys = _core.delimitedStringToArray(keys, opts);
//                if (_.isArray(keys)){
                    return _core.lookupPath(keys, this);
//                } else {
//                    return Backbone.Model.prototype.get.apply(this, arguments);
//                }
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
                    keys = _core.delimitedStringToArray(keys, opts);
                    attrs = _core.toObj(keys, value);
                }

                /**
                 * Skip the case of a simple key/value pair being
                 * passed in, or the case that value is already a Backbone.Model TODO
                 */
                if (_.isObject(attrs) && !(opts instanceof Backbone.Model)){
                    attrs = _core.prepAttributes.call(this, spec, attrs, opts);
                }

                return Backbone.Model.prototype.set.call(this, attrs, opts);
            },

            /**
             * @param attr (optional) can use the nestify array or
             * stringified array form. If present, this param is
             * interpreted as an array of one or more strings
             * describing a path of nesting. The (zero-or-more)
             * Strings excluding the last one are used to fetch a
             * nested Model or Collection on which to call
             * <code>hasChanged</code>, and the remaining String is
             * passed as the <code>attr</code> arg.
             * @param opts (optional) can include a
             * <code>nested</code> boolean arg to indicate whether
             * this (or nested) Model should be checked recursively
             * for change.
             * @return true or false
             */
            hasChanged: function(attr, opts){

                if (_.isObject(attr) && !_.isArray(attr)){
                    opts = _.extend({}, _moduleOpts, attr);
                    attr = [];
                } else {
                    opts = _.extend({}, _moduleOpts, opts);
                    attr = _core.delimitedStringToArray(attr, opts);
                }

                var path = _.initial(attr),
                    // 'path' might be empty in which case 'this' is returned
                    ctx = _core.lookupPath(path, this);

                return ctx ?_core.hasChangedDeep.call(ctx, _core.hasChangedDeep, (opts.nested === true), _.last(attr)) : false;
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
        auto: function(opts){
            opts = opts || {};

            // private, anonymous subtypes
            var M = Backbone.Model.extend(opts.extend),
                C = Backbone.Collection.extend({model:M});

            var spec = [{
                match: _matchers.isArrayOfObjects,
                container: C
            },{
                match: _matchers.and(_matchers.isObject, _matchers.not(_matchers.isArray)),
                container: _.extend({
                    constructor: M
                }, opts)
            }];

            var compiled = mixinFn(spec, opts);

            /*
             * Mix the compiled spec into our anonymous Model subclass;
             * this causes the spec to be in effect recursively for
             * nested objects and containers.
             */
            _.extend(M.prototype, compiled);

            return compiled;
        },

        /**
         * alpha: subject to change
         * Nestify a Backbone.Model instance in-place, modifying it's
         * internal attributes according to the supplied spec.
         * @param modelInstance an existing instance of Backbone.Model
         * (or subclass)
         * @param mixin produced by nestify(...)
         * @param opts (optional) opts to Backbone
         * @return the modelInstance param
         */
        instance: function(modelInstance, mixin, opts){
            if (modelInstance instanceof Backbone.Model) {
                _.extend(modelInstance, mixin || mixinFn(opts));
                var atts = modelInstance.attributes;
                modelInstance.attributes = {}; //TODO why is this necessary?
                modelInstance.set(atts, opts);
            }
            return modelInstance;
        },

        // for testing purposes TODO
        _pathToObject: _core.toObj,
        _properNum: _core.properNum
    });

    return mixinFn;
}));
