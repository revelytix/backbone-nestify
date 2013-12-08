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
        delim: "|"
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
     * If the property key is a pipe-delimited string such as
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
     * Converts a path of key(s) and a value to raw JSON object
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
     * if path is (2) build up json
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
     * Create new Models from the indicated Collection Model, and
     * 'reset' them on the Collection
     * @param coll Backbone.Collection which is to be reset with
     * new models
     * @param atts raw JSON which is to be used to instantiate new
     * Models to 'reset' to the Collection
     * @param opts (optional) options to the Model constructor and
     * Collection 'reset' method.
     */
    var _resetColl = function(coll, atts, opts){
        _assertArray(atts);
        var Constructor = coll.model;
        coll.reset(_.map(atts, function(att){
            return new Constructor(att, opts);
        }), opts);
    };

    /**
     * Create new Models from the indicated Collection Model, and
     * intelligently merge them in to the Collection.
     * @param coll Backbone.Collection which is to be merged with
     * new models
     * @param atts raw JSON which is to be used to instantiate new
     * Models to add to the Collection
     * @param opts (optional) options to the Model constructor
     * or Model 'set' method
     */
    var _setColl = function(coll, atts, opts){
        _assertArray(atts);
        var Constructor = coll.model;
        coll.set(_.map(atts, function(att){
            return new Constructor(att, opts);
        }), opts);
    };

    /**
     * Default behavior, update nested collection index-based.
     * (Doesn't really use 'at' function, currently.)
     */
    var _atColl = function(coll, atts, opts){
        _assertArray(atts);
        var Constructor = coll.model;
        var alist = _.zip(coll.models, atts);
        _.each(alist, function(pair, i){

            var m = _.first(pair);
            var att = _.last(pair);

            if (att){
                if (!m){
                    m = new Constructor(att, opts);
                    coll.models[i] = m;
                } else {
                    m.set(att, opts);
                }
            }
        });
    };

    /**
     * The input 'setAttributes' is raw json; reduce over it to
     * produce an equivalent object with existing nested backbone
     * models or other objects in the right places.
     * @param this a Backbone.Model having this mixin
     * @param attrNamesToModelConstructors hash of String model
     * attribute names, mapped to the constructor which must be
     * used to instantiate a new nested Backbone model for that
     * attribute. (see Example Usage doc)
     * @param setAttributes the raw JSON which is to be
     * transformed and made ready to be set on the model
     * @param options (optional) options to the 'set' method
     * @return prepared 'set attributes' ready to be set on the
     * Backbone model with
     */ 
    var _prepAttributes  = function(attrNamesToModelConstructors, setAttributes, options){

        options = options || {};

        /**
         * The input 'setAttributes' is raw json; reduce over it to
         * produce an equivalent object with existing nested backbone
         * models or other objects in the right places. Then set that on 
         * the model.
         */ 
        setAttributes = _.reduce(setAttributes, function(atts, v, k){

            var newVal = v;
            if (v instanceof Backbone.Model ||
                v instanceof Backbone.Collection ||
                (options.unset && !existy(v))){
                // skip to end
            } else {
                var existing = (this.attributes && this.attributes[k]);
                var ctx = attrNamesToModelConstructors[k];

                if (ctx){
                    // Nested Backbone Model or Constructor case.

                    // Either reuse the nested thingy, if
                    // present, or create a new nested instance
                    var thingy = existing || new ctx.constructor(ctx.args);

                    // TODO Backbone.Collection has a 'set' method in
                    // Backbone 1.0.0; just use 'reset' for now.
                    if (thingy.reset){// It's a Backbone.Collection
                        if (existing){
                            switch (options.coll){
                            case "reset":
                                _resetColl(thingy, v, options);
                                break;
                            case "set":
                                _setColl(thingy, v, options);
                                break;
                            case "at":
                                /* jshint -W086 */
                            default:
                                _atColl(thingy, v, options);
                                break;
                            }
                        } else {
                            _resetColl(thingy, v, options);
                        }
                    } else {// It's a Backbone.Model
                        thingy.set(v, options);
                    }

                    // Finally, set the nested thingy on the
                    // current attributes.
                    newVal = thingy;
                } else if (existing){
                    // Existing value with name
                    if (_.isArray(existing)){
                        newVal = _.map(_.zip(v, existing), _.compose(_.first, _.compact));
                    } else if (_.isObject(existing)){
                        newVal = _.extend({}, existing, v);                                    
                    }
                } 

            }
            atts[k] = newVal;

            return atts;
        }, {}, this);

        return setAttributes;
    };

    /**
     * Return the module: a function which must be invoked to
     * produce the mixin.
     *
     * @param specs specifications - a hash of String attribute name
     * to object containing a nested model
     * constructor function and optional args
     * which will create a new instance of a nested model for
     * storing that attribute.
     *
     * @param opts options
     *
     * Example usage - no specs
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
     * Example usage - with additional specs to nexted model constructor:
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
    var mixinFn = function(specs, opts){

        var _opts = _.extend({}, _defaultOpts, opts),
            _attrNamesToModelConstructors = specs || {},
            _prepAtts = _.partial(_prepAttributes, _attrNamesToModelConstructors);

        return {
            /**
             * Dopified 'get' method: handles nested model. Allows, as a
             * convenience, a syntax to get values from nested models:
             *
             * m.get(["foo/Attr", "nestedFoo/Attr", 1, "nestedBaz/Attr"]);
             *
             * or alternate pipe-delimited String syntax:
             *
             * m.get("foo/Attr|nestedFoo/Attr|1|nestedBaz/Attr");
             * 
             * Strings point to nested Models, integers point to nested
             * Collections.
             */
            get: function(keys){
                keys = _delimitedStringToArray(keys, _opts);
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
             * or alternate pipe-delimited String syntax:
             *
             * m.set("foo/Attr|nestedFoo/Attr|2|keyToSet", "valueToSet);
             *
             * Strings point to nested Models, integers point to nested
             * Collections.
             */
            set: function(keys, value, opts){
                keys = _delimitedStringToArray(keys, _opts);
                var attrs;

                if (_.isArray(keys)){
                    attrs = _toObj(keys, value);
                } else if (_.isObject(keys)) {
                    attrs = keys instanceof Backbone.Model ? keys.attributes : keys;
                    opts = value;
                } else {
                    attrs = _toObj(keys, value);
                }
                opts = _.extend({}, _opts, opts);

                /**
                 * Skip the case of a simple key/value pair being
                 * passed in, or the case that value is already a Backbone.Model
                 */
                if (_.isObject(attrs) && !(opts instanceof Backbone.Model)){
                    opts = _.extend({}, _defaultOpts, opts);
                    attrs = _prepAtts.call(this, attrs, opts);
                }

                return Backbone.Model.prototype.set.call(this, attrs, opts);
            }
        };
    };

    // for testing purposes
    mixinFn.pathToObject = _toObj;

    return mixinFn;
}));



