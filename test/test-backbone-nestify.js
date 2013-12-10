(function (factory){
    // node
    if (typeof module === 'object') {
        module.exports = factory(
            require('underscore'), 
            require('backbone'), 
            require('chai'), 
            require('mocha'),
            require('../backbone-nestify'));
    // require.js
    } else if (typeof define === 'function' && define.amd) {
        define([
            "underscore", 
            "backbone",
            "chai",
            "mocha",
            "backbone-nestify"
        ], factory);
    } else {
        // globals 
        factory(this._, this.Backbone, this.chai, this.mocha, this.nestify);
    }
}(function(_, Backbone, chai, mocha, nestify) {

    var assert = chai.assert,
        expect = chai.expect;

    describe('Nestify', function(){

        var env;

        beforeEach(function(){

            /*
             specs:

             ShoppingCart
              - "pending"      => Order   0..1
              - "account"      => Account 1

             Account
              - "orders"       => [Order] 0..*

             Order
              - "items"        => [Item]  0..*
             */

            var Item = Backbone.Model;
            var Items = Backbone.Collection.extend({model:Item});
            var Order = Backbone.Model.extend(nestify({
                items: {constructor:Items}
            }));
            var Orders = Backbone.Collection.extend({model:Order});
            var Account = Backbone.Model.extend(nestify({
                orders: {constructor:Orders}
            }));
            var ShoppingCart = Backbone.Model.extend(nestify({
                pending: {constructor: Order},
                account: {constructor: Account}
            }));

            env = {
                Item: Item,
                Items: Items,
                Order: Order,
                Orders: Orders,
                Account: Account,
                ShoppingCart: ShoppingCart
            };
        });

        describe('simple set', function(){
            it("should work as normal", function(){
                var a = new env.Account();
                a.set("id", 3);
                expect(a.get("id")).to.equal(3);
            });
        });

        describe('single Model', function(){
            it("should have undefined attributes, initially", function(){
                var a = new env.Account();
                expect(a.get("phone")).to.be.undefined;
                expect(a.get("email")).to.be.undefined;
            });
        });

        describe('nested Model set', function(){
            it("should allow retrieval of nested value(s) using either syntax style", function(){
                var cart = new env.ShoppingCart();
                var acct = new env.Account();
                cart.set("account", acct);
                acct.set("email", "nuge@hotmail.com");
                expect(cart.get(["account", "email"])).to.equal("nuge@hotmail.com");
                expect(cart.get("account|email")).to.equal("nuge@hotmail.com");
            });
            it("should allow set using array syntax", function(){
                var cart = new env.ShoppingCart();
                var acct = new env.Account();
                cart.set("account", acct);
                cart.set(["account","email"], "nuge@hotmail.com");
                expect(acct.get("email")).to.equal("nuge@hotmail.com");
            });
            it("should allow set using stringified syntax", function(){
                var cart = new env.ShoppingCart();
                var acct = new env.Account();
                cart.set("account", acct);
                cart.set("account|email", "nuge@hotmail.com");
                expect(acct.get("email")).to.equal("nuge@hotmail.com");
            });
            it("should allow set using JSON", function(){
                var cart = new env.ShoppingCart();
                var acct = new env.Account();
                cart.set("account", acct);
                cart.set({account: {email:"nuge@hotmail.com"}});
                expect(acct.get("email")).to.equal("nuge@hotmail.com");
            });
        });

        /**
         * Test model can be constructed w/ raw JSON, and
         * nested model is of the correct expected type
         */
        describe('nested model dynamic construction', function(){
            it("should be spec'd, then constructed with raw JSON", function(){
                var cart = new env.ShoppingCart({account: {email:"nuge@hotmail.com"}});
                expect(cart.get("account|email")).to.equal("nuge@hotmail.com");
                expect(cart.get("account")).to.be.an.instanceof(env.Account);
            });
        });

        /**
         * Similar test, for arrays/Collections
         */
        describe('nested collection dynamic construction', function(){
            it("should be spec'd, then constructed with raw JSON", function(){
                var acct = new env.Account({orders: [{id:51}, {id:52}]});
                expect(acct.get("orders|0|id")).to.equal(51);
                expect(acct.get("orders|1|id")).to.equal(52);
                expect(acct.get("orders")).to.be.an.instanceof(env.Orders);
                expect(acct.get("orders|0")).to.be.an.instanceof(env.Order);
            });
        });

        describe('nested collection', function(){
            it("should support the get syntax options", function(){
                var acct = new env.Account();
                var orders = new env.Orders();
                var order = new env.Order();
                var order2 = new env.Order();
                acct.set("orders", orders);
                orders.add(order);
                orders.add(order2);
                order.set("spicy", "meatball");
                order2.set("tangy", "tofu");
                expect(acct.get(["orders", 0, "spicy"])).to.equal("meatball");
                expect(acct.get("orders|0|spicy")).to.equal("meatball");
                expect(acct.get(["orders", 1, "tangy"])).to.equal("tofu");
            });

            it("should support the set syntax options", function(){
                var acct = new env.Account();
                var orders = new env.Orders();
                var order = new env.Order();
                var order2 = new env.Order();
                acct.set("orders", orders);
                orders.add(order);
                orders.add(order2);
                acct.set(["orders", 0, "spicy"], "meatball");
                expect(order.get("spicy")).to.equal("meatball");
                acct.set(["orders", 1, "greasy"], "granny");
                expect(order2.get("greasy")).to.equal("granny");
            });

            it("should support stringified set", function(){
                var acct = new env.Account();
                var orders = new env.Orders();
                var order = new env.Order();
                acct.set("orders", orders);
                orders.add(order);
                acct.set("orders|0|spicy", "meatball");
                expect(order.get("spicy")).to.equal("meatball");
            });
        });

        describe('configurable delimiter', function(){
            it("can be changed at specification time", function(){
                var ShoppingCart = Backbone.Model.extend(nestify({
                    pending: {constructor: env.Order},
                    account: {constructor: env.Account}
                },{
                    delim:"." //period
                }));

                var cart = new ShoppingCart({
                    account: {email: "nuge@hotmail.com"}
                });
                expect(cart.get("account.email")).to.equal("nuge@hotmail.com");
                cart.set("account.email", "nuge@geocities.com");
                expect(cart.get("account.email")).to.equal("nuge@geocities.com");
            });
            it("can be changed at get/set time", function(){
                var cart = new env.ShoppingCart({
                    account: {email: "nuge@hotmail.com"}
                });
                expect(cart.get("account.email", {delim:"."})).to.equal("nuge@hotmail.com");
                cart.set("account,email", "nuge@geocities.com", {delim:","});
                expect(cart.get("account|email")).to.equal("nuge@geocities.com");
                cart.set("account,email", "nuge@geocities.com", {delim:","});
                expect(cart.get("account|email")).to.equal("nuge@geocities.com");
                cart.set({"account?email": "nuge@geocities.com"}, {delim:"?"});
                expect(cart.get("account email", {delim:" "})).to.equal("nuge@geocities.com");
            });
        });

        /**
         * Note that setting things up front overrides any
         * constructors that may be declared for a nested property.
         */
        describe('deeply-nesting models', function(){
            it("should allow up-front assemblage of nested models, overriding spec", function(){
                var acct = new env.Account();
                var acct2 = new env.Account();
                var orders = new env.Orders();
                var orders2 = new env.Orders();
                var orders3 = new env.Orders();
                var order = new env.Order();
                acct.set("orders", orders);
                orders.add(acct2);  // contrived; just to demonstrate
                acct2.set("orders2", orders2);
                acct2.set("orders", orders3);
                orders2.add(order);
                orders3.add(new env.Order({greasy:"granny"}));
                order.set("monkey", "butter");
                expect(acct.get("orders|0|orders2|0|monkey")).to.equal("butter");
                expect(acct.get("orders|0|orders|0|greasy")).to.equal("granny");
            });

            /**
             * If the value being passed in is already a
             * Backbone.Model or Collection instance, preserve 
             * that instance
             */
            it("set should preserve the instance", function(){
                var cart = new env.ShoppingCart();
                var orders = new env.Orders();
                cart.set("account", orders); // contrived, just to demonstrate
                expect(cart.get("account")).to.be.an.instanceof(env.Orders);
            });
        });

        /**
         * Test that standard Backbone options are supported. 
         */
        describe('set with options', function(){

            it("silent should suppress events", function(){
                var eventHeard = false;
                var cart = new env.ShoppingCart();
                var acct = new env.Account();
                cart.set("account", acct);
                acct.on("change:loud", function(){eventHeard = true;});
                acct.on("change:quiet", assert.fail);
                cart.set({account: {loud: 4}});
                cart.set({account: {quiet: 8}}, {silent:true});
                expect(eventHeard).to.be.true;
            });

            /**
             * similar to previous; counts the number of events on
             * the top-level model 
             */
            it("should count events without silent", function(){
                var eventCount = 0;
                var cart = new env.ShoppingCart();
                cart.on("change", function(){eventCount = eventCount + 1;});
                cart.set("account", new env.Account());
                cart.set({account: {loud: 4}});
                expect(eventCount).to.equal(1);
            });

            it("should set nested JSON silently", function(){
                var cart = new env.ShoppingCart();
                cart.on("change", assert.fail);
                cart.set({account: {id: 8}}, {silent:true});
            });

            it("should set JSON on nested model silently", function(){
                var cart = new env.ShoppingCart();
                var acct = new env.Account();
                acct.set("id", 8);
                cart.on("change", assert.fail);
                cart.set({account: acct}, {silent:true});
            });

            it("should should set JSON on nested collection silently", function(){
                var acct = new env.Account();
                acct.on("change", assert.fail);
                acct.set({orders: [{id: {quiet: 8}}]}, {silent:true});
            });

            it("should set nested collection silently", function(){
                var acct = new env.Account();
                var orders = new env.Orders();
                orders.add(new env.Order({quiet:8}));
                acct.on("change", assert.fail);
                acct.set({orders: orders}, {silent:true});
            });
        });

        describe('nesting an existing model into a model', function(){

            it("should work if pre-constructed", function(){
                var orders = new env.Orders(new env.Order({name:"Tim"}));
                var acct = new env.Account();
                acct.set("orders", orders);
                expect(acct.get("orders|0|name")).to.equal("Tim");
            });

            it("should work if pre-constructed using JSON", function(){
                var orders = new env.Orders(new env.Order({name:"Tim"}));
                var acct = new env.Account();
                acct.set({orders: orders});
                expect(acct.get("orders|0|name")).to.equal("Tim");
            });

            it("should work if modifed after nesting", function(){
                var orders = new env.Orders();
                var acct = new env.Account();
                acct.set("orders", orders);
                orders.add(new env.Order({name:"Tim"}));
                expect(acct.get("orders|0|name")).to.equal("Tim");
            });

            it("should work if modified with JSON after nesting", function(){
                var orders = new env.Orders();
                var acct = new env.Account();
                acct.set({orders: orders});
                orders.add(new env.Order({name:"Tim"}));
                expect(acct.get("orders|0|name")).to.equal("Tim");
            });

            it("should allow construction with JSON", function(){
                var orders = new env.Orders(new env.Order({name:"Tim"}));
                var acct = new env.Account({orders: orders});
                expect(acct.get("orders|0|name")).to.equal("Tim");
            });
        });

        describe('constructing a model with a nested collection', function(){

            it("should allow JSON set", function(){
                var acct = new env.Account();
                var orders = new env.Orders();
                var order = new env.Order();
                acct.set("orders", orders);
                orders.add(order);
                acct.set({orders:[{spicy:"meatball"}]});
                expect(order.get("spicy")).to.equal("meatball");
            });

            it("should allow JSON set, followed by collection modification", function(){
                var acct = new env.Account();
                var orders = new env.Orders();
                acct.set("orders", orders);
                orders.add(new env.Order());
                acct.set({orders:[{spicy:"meatball"}]});
                expect(acct.get("orders|0|spicy")).to.equal("meatball");
                expect(acct.get("orders|0")).to.be.an.instanceof(env.Order);
            });

            it("should allow modifying the nested collection's model", function(){
                // setup
                var orders = new env.Orders(new env.Order({name:"Tim"}));
                orders.add(new env.Order({name:"Tom"}));
                var acct = new env.Account();
                acct.set("orders", orders);
                expect(acct.get("orders|0|name")).to.equal("Tim");
                expect(acct.get("orders|1|name")).to.equal("Tom");

                // test
                acct.set({orders:[{spicy:"meatball"}]});

                // expectations
                expect(acct.get("orders|0|spicy")).to.equal("meatball");
                expect(acct.get("orders|0|name")).to.equal("Tim");
                expect(acct.get("orders|0")).to.be.an.instanceof(env.Order);
                expect(acct.get("orders|1|name")).to.equal("Tom");
            });

            it("should allow setting of nested collection's models' attributes", function(){
                var acct = new env.Account();
                var orders = new env.Orders();
                var order0 = new env.Order();
                var order1 = new env.Order();
                acct.set("orders", orders);
                orders.add(order0);
                orders.add(order1);
                acct.set("orders|0|spicy", "meatball");
                expect(order0.get("spicy")).to.equal("meatball");
                expect(order1.get("spicy")).to.be.undefined;
                acct.set("orders|1|spicy", "canoli");
                expect(order0.get("spicy")).to.equal("meatball");
                expect(order1.get("spicy")).to.equal("canoli");
            });
        });

        describe('fine-grained control of nested collection modification by using custom options', function(){

            describe('setting with the "reset" option', function(){
                /**
                 * Simulates the case of a sync: we expect the nested
                 * set to completely replace the contents of any 
                 * nested collections. Hence the {reset:true} option.
                 */
                it("should completely replace the contents of the nested collection", function(){
                    var acct = new env.Account({orders:[{spicy:"meatball"},
                                                        {tangy:"salsa"}]
                                               });
                    expect(acct.get("orders").models.length).to.equal(2);
                    acct.set({orders:[{hot:"sausage"}]}, {coll:"reset"});
                    expect(acct.get("orders").models.length).to.equal(1);
                });

                it("can instead be set as a module option", function(){
                    var Account = Backbone.Model.extend(nestify({
                        orders: {constructor:env.Orders}
                    }, {
                        coll:"reset"
                    }));

                    var acct = new Account({orders:[{spicy:"meatball"},
                                                    {tangy:"salsa"}]
                                           });
                    expect(acct.get("orders").models.length).to.equal(2);
                    acct.set({orders:[{hot:"sausage"}]});
                    expect(acct.get("orders").models.length).to.equal(1);
                });
            });

            describe('setting with the "set" option', function(){

                /**
                 * Update nested collection with built-in 'set'
                 * function, relying on 'smart' merge, with remove set
                 * to false. Therefore we expect to add the new model
                 * without removing any others.
                 */
                it("should add new models w/o removing others", function(){
                    var acct = new env.Account({orders:[{spicy:"meatball"},
                                                        {tangy:"salsa"}]
                                               });
                    expect(acct.get("orders").models.length).to.equal(2);
                    acct.set({orders:[{hot:"sausage"}]}, {coll:"set", remove:false});
                    expect(acct.get("orders").models.length).to.equal(3);

                });

                it("can instead be set as a module option", function(){
                    var Account = Backbone.Model.extend(nestify({
                        orders: {constructor:env.Orders}
                    }, {
                        coll:"set"
                    }));

                    var acct = new Account({orders:[{spicy:"meatball"},
                                                    {tangy:"salsa"}]
                                           });
                    expect(acct.get("orders").models.length).to.equal(2);
                    acct.set({orders:[{hot:"sausage"}]}, {remove:false});
                    expect(acct.get("orders").models.length).to.equal(3);
                });
            });

            /**
             * The default and most precise behavior: nested
             * collections are updated with 'at' function based on
             * index.
             */
            describe('setting with the default "at" option', function(){
                it("should update based on index", function(){
                    var acct = new env.Account({orders:[{spicy:"meatball"},
                                                        {tangy:"salsa"}]
                                               });
                    expect(acct.get("orders").models.length).to.equal(2);
                    acct.set({orders:[{hot:"sausage"}]}, {coll:"at"});
                    expect(acct.get("orders").models.length).to.equal(2);
                });

                it("can instead be set as a module option", function(){
                    var Account = Backbone.Model.extend(nestify({
                        orders: {constructor:env.Orders}
                    }, {
                        coll:"at"
                    }));

                    var acct = new Account({orders:[{spicy:"meatball"},
                                                    {tangy:"salsa"}]
                                           });
                    expect(acct.get("orders").models.length).to.equal(2);
                    acct.set({orders:[{hot:"sausage"}]});
                    expect(acct.get("orders").models.length).to.equal(2);
                });
            });
        });

        describe('uninitialized nested collection', function(){
            it("should dynamically construct instance of the spec'd model", function(){
                var acct = new env.Account();
                acct.set("orders|2|spicy", "meatball");
                var b = acct.get("orders|2");
                expect(b).to.be.an.instanceof(env.Order);
                expect(b.get("spicy")).to.equal("meatball");
            });
        });

        describe("nesting non-spec'd attributes", function(){

            /*
             * Nested attributes that are not spec'd as having a Model
             * or Collection constructor can still be gotten and set
             * using the custom nested getter/setter syntax.
             */

            it('should nest primitives', function(){
                var order = new env.Order();
                order.set("something|spicy", "meatball");
                expect(order.get("something|spicy")).to.equal("meatball");
            });

            it('should nest primitive into an array', function(){
                var order = new env.Order();
                order.set("something|2|spicy", "meatball");
                expect(order.get("something|2|spicy")).to.equal("meatball");
            });

            it('should make array rather than Collection, obj rather than Model', function(){
                var order = new env.Order();
                order.set("something|2|spicy", "meatball");
                expect(order.get("something")).to.not.be.an.instanceof(Backbone.Collection);
                expect(order.get("something")).to.be.instanceof(Array);
                expect(order.get("something|2")).to.not.be.an.instanceof(Backbone.Model);
                expect(order.get("something|2")).to.not.be.an.instanceof(Array);
                expect(order.get("something|2")).to.be.an.instanceof(Object);
                expect(order.get("something|2|spicy")).to.equal("meatball");
                expect(order.get("something")).to.deep.equal([, , {spicy:"meatball"}]);
            });

            it('should fill array sparsely if necessary', function(){
                var order = new env.Order();
                order.set(["something", 0], "snuh");
                order.set(["something", 2], "blammo");
                var b = order.get("something");
                expect(b).to.be.an.instanceof(Array);
                expect(b[0]).to.equal("snuh");
                expect(b[1]).to.be.undefined;
                expect(b[2]).to.equal("blammo");
            });

            it('should set objects nested', function(){
                var order = new env.Order();
                order.set(["something", "aak"], "snuh");
                order.set(["something", "oop"], "blammo");
                var b = order.get("something");
                expect(b).to.be.an.instanceof(Object);
                expect(b.aak).to.equal("snuh");
                expect(b.oop).to.equal("blammo");
            });

            /**
             * Tests that a nested Model may be unitialized, as
             * long as its constructor is spec'd
             */
            it("should create nested Model, if necessary, of spec'd type", function(){
                var cart = new env.ShoppingCart();
                cart.set(["account", "something"], 4);
                var acct = cart.get("account");
                expect(acct).to.not.be.undefined;
                expect(acct.get("something")).to.equal(4);
                expect(acct).to.be.an.instanceof(env.Account);
                expect(acct.constructor).to.equal(env.Account);
            });
        });

        /**
         * Test 'private' pathToObject function
         */
        describe('pathToObject', function(){
            it('should convert JSON to nested path form', function(){
                var expected = {foo: "bar"};
                expect(nestify.pathToObject("foo", "bar")).to.deep.equal(expected);
            });

            it('should convert JSON to nested path form', function(){
                var expected = {foo: {bar: "Baz"}};
                expect(nestify.pathToObject(expected)).to.deep.equal(expected);
                expect(nestify.pathToObject(["foo", "bar"], "Baz")).to.deep.equal(expected);
            });

            it('should convert JSON with array to nested path form', function(){
                var expected = {foo: [{baz: "Goo"}]};
                expect(nestify.pathToObject(expected)).to.deep.equal(expected);
                expect(nestify.pathToObject(["foo", 0, "baz"], "Goo")).to.deep.equal(expected);
            });

            it('should convert JSON with array to nested path form', function(){
                var expected = {foo: {bar: [, , {baz: "Goo"}]}};
                expect(nestify.pathToObject(expected)).to.deep.equal(expected);
                expect(nestify.pathToObject(["foo", "bar", 2, "baz"], "Goo")).to.deep.equal(expected);
            });

            it('should convert JSON with null value to nested path form', function(){
                var expected = {foo: {bar: null}};
                expect(nestify.pathToObject(["foo", "bar"], null)).to.deep.equal(expected);
            });

            it('should convert JSON with undefined value to nested path form', function(){
                var un_D_fined;
                var expected = {foo: {bar: un_D_fined}};
                expect(nestify.pathToObject(["foo", "bar"], un_D_fined)).to.deep.equal(expected);
            });

            it('should convert JSON with undefined value to nested path form', function(){
                var un_D_fined = void 0;
                var expected = {foo: [{bar: un_D_fined}]};
                expect(nestify.pathToObject(["foo", 0, "bar"], un_D_fined)).to.deep.equal(expected);
            });
        });

        describe('more complex example', function(){

            it('should nest properly via constructor construction', function(){
                var item1 = new env.Item({name:"rhubarb"});
                var item2 = new env.Item({name:"molten boron"});
                var items = new env.Items([item1, item2]);
                var order = new env.Order({items:items, name:"grocery"});
                var orders = new env.Orders([order]);
                var account = new env.Account({orders:orders, id:7});

                expect(account.get("id")).to.equal(7);
                expect(account.get("orders|0|name")).to.equal("grocery");
                expect(account.get("orders|0|items|0|name")).to.equal("rhubarb");
                expect(account.get("orders|0|items|1|name")).to.equal("molten boron");
                account.set("orders|0|items|0|name", "meatball");
                expect(account.get("orders|0|items|0|name")).to.equal("meatball");
                expect(account.get("orders|0|items|1|name")).to.equal("molten boron");
                account.set("orders|0|items|1|name", "canoli");
                expect(account.get("orders|0|items|0|name")).to.equal("meatball");
                expect(account.get("orders|0|items|1|name")).to.equal("canoli");
            });

            it('should nest properly via setter construction', function(){
                var item1 = new env.Item({name:"rhubarb"});
                var item2 = new env.Item({name:"molten boron"});
                var items = new env.Items([item1, item2]);
                var order = new env.Order({items:items, name:"grocery"});
                var orders = new env.Orders([order]);
                var account = new env.Account({orders:orders, id:7});

                // construction
                items.add(item1);
                items.add(item2);
                order.set("items", items);
                orders.add(order);
                account.set("orders", orders);

                // expectations
                expect(account.get("id")).to.equal(7);
                expect(account.get("orders|0|name")).to.equal("grocery");
                expect(account.get("orders|0|items|0|name")).to.equal("rhubarb");
                expect(account.get("orders|0|items|1|name")).to.equal("molten boron");
                account.set("orders|0|items|0|name", "meatball");
                expect(account.get("orders|0|items|0|name")).to.equal("meatball");
                expect(account.get("orders|0|items|1|name")).to.equal("molten boron");
                account.set("orders|0|items|1|name", "canoli");
                expect(account.get("orders|0|items|0|name")).to.equal("meatball");
                expect(account.get("orders|0|items|1|name")).to.equal("canoli");
            });

            it('should nest properly via setter construction, alternate ordering', function(){
                var item1 = new env.Item({name:"rhubarb"});
                var item2 = new env.Item({name:"molten boron"});
                var items = new env.Items([item1, item2]);
                var order = new env.Order({items:items, name:"grocery"});
                var orders = new env.Orders([order]);
                var account = new env.Account({orders:orders, id:7});

                // construction
                account.set("orders", orders);
                orders.add(order);
                order.set("items", items);
                items.add(item1);
                items.add(item2);

                // expectations
                expect(account.get("id")).to.equal(7);
                expect(account.get("orders|0|name")).to.equal("grocery");
                expect(account.get("orders|0|items|0|name")).to.equal("rhubarb");
                expect(account.get("orders|0|items|1|name")).to.equal("molten boron");
                account.set("orders|0|items|0|name", "meatball");
                expect(account.get("orders|0|items|0|name")).to.equal("meatball");
                expect(account.get("orders|0|items|1|name")).to.equal("molten boron");
                account.set("orders|0|items|1|name", "canoli");
                expect(account.get("orders|0|items|0|name")).to.equal("meatball");
                expect(account.get("orders|0|items|1|name")).to.equal("canoli");
            });
        });

        /**
         * Test that the presence of 'attributes' property in 
         * non-Backbone model doesn't break stuff
         */
        describe('attribute named "attribute"', function(){
            it('should not break', function(){
                var a = new env.Account({foo:{attributes:{msg:"haha"}}});
                expect(a.get("foo|attributes|msg")).to.equal("haha");
            });

            it('should not break; distinct models', function(){
                var acct = new env.Account({attributes: {msg: "haha"}});
                var cart = new env.ShoppingCart({account:acct});
                expect(cart.get("account|attributes|msg")).to.equal("haha");
            });
        });

        describe("calling 'set' with Model instance", function(){
            it("should produce duplicate model", function(){
                var cart = new env.ShoppingCart();
                var cart0 = new env.ShoppingCart({account: {id: 8}});
                cart.set(cart0);
                expect(cart.toJSON()).to.deep.equal(cart0.toJSON());
            });
        });

        /**
         * Everything is 'existy' except null and undefined.
         */
        describe('test setting values of different existy-ness', function(){
            it("should not set values that aren't existy.", function(){
                var acct = new env.Account();
                var cart = new env.ShoppingCart({account:acct});
                cart.set("account|truDat", true);
                cart.set("account|nope", false);
                cart.set("account|aNull", null);
                cart.set("account|aUndef", env.unDFynd);
                expect(acct.get("truDat")).to.be.true;
                expect(acct.get("nope")).to.be.false;
                expect(acct.get("aNull")).to.be.null;
                expect(acct.get("aUndef")).to.be.undefined;
            });
        });

        /**
         * Everything is 'existy' except null and undefined.
         */
        describe('changing based on existy-ness', function(){
            it("should make changes given values that are existy.", function(){
                var acct = new env.Account({"truDat":false,
                                            "nope":true});
                var cart = new env.ShoppingCart({account:acct});
                cart.set("account|truDat", true);
                cart.set("account|nope", false);
                expect(acct.get("truDat")).to.be.true;
                expect(acct.get("nope")).to.be.false;
            });
            /*TODO?
            it("should not make change given values that are not existy.", function(){
                var acct = new env.Account({"truDat":false,
                                            "nope":true});
                var cart = new env.ShoppingCart({account:acct});
                cart.set("account|truDat", null);
                cart.set("account|nope", env.unDFynd);
                expect(acct.get("truDat")).to.be.false;
                expect(acct.get("nope")).to.be.true;
            });
             */
        });

        describe('unset', function(){

            it('should unset in a nested model', function(){
                var cart = new env.ShoppingCart({account: {id: 4}});
                expect(cart.get("account|id")).to.equal(4);
                cart.unset("account|id");
                expect(cart.get("account|id")).to.be.undefined;
            });

            it('should unset a non-nested attribute', function(){
                var acct = new env.Account({id: 4});
                expect(acct.get("id")).to.equal(4);
                acct.unset("id");
                expect(acct.get("id")).to.be.undefined;
            });

            it('should unset silently', function(){
                var acct = new env.Account();
                var cart = new env.ShoppingCart();
                cart.set({account: acct});
                acct.set({id: 8});
                cart.on("change", assert.fail);
                acct.on("change", assert.fail);
                cart.unset("account|id", {silent:true});
            });

            it('should unset with a Collection', function(){
                var order = new env.Order();
                var items = new env.Items();
                var item = new env.Item();
                order.set("items", items);
                items.add(item);
                order.set("items|0|spicy", "meatball");
                expect(item.get("spicy")).to.equal("meatball");
                order.unset("items|0|spicy");
                expect(item.get("spicy")).to.be.undefined;
            });

            it('should unset a Collection', function(){
                var order = new env.Order();
                var items = new env.Items();
                var item = new env.Item();
                order.set("items", items);
                items.add(item);
                order.set("items|0|spicy", "meatball");
                expect(item.get("spicy")).to.equal("meatball");
                order.unset("items");
                expect(order.get("items")).to.be.undefined;
            });
        });

        describe('clear', function(){
            it("should clear all nested", function(){
                var order = new env.Order();
                var items = new env.Items();
                var item = new env.Item();
                order.set("items", items);
                items.add(item);
                order.set("items|0|spicy", "meatball");
                expect(item.get("spicy")).to.equal("meatball");
                order.clear();
                expect(order.attributes).to.be.empty;
            });
        });

        describe('spec API', function(){

            it('should contain only get and set keys', function(){
                var spec = nestify({
                    'orders':{constructor:env.Orders}
                });
                
                expect(_.keys(spec)).to.deep.equal(["get","set"]);
            });
            
            it('should allow nil config', function(){
                var spec = nestify();
                
                expect(_.keys(spec)).to.deep.equal(["get","set"]);
            });

            it('can be mixed into individual Model instance', function(){
                var spec = nestify({
                    'orders':{constructor:env.Orders}
                });

                var m1 = new Backbone.Model(),
                    m2 = new Backbone.Model(),
                    input = {
                        orders: [
                            {id:1},
                            {id:2}
                        ]
                    };
                _.extend(m2, spec);
                m1.set(input);
                m2.set(input);
                
                expect(m1.get('orders')).to.be.an.instanceof(Array);
                expect(m2.get('orders')).to.be.an.instanceof(env.Orders);
            });


            describe('Model/Collection constructor spec', function(){

                it("can be abbreviated if it's only a constructor fn", function(){
                    var spec = nestify({
                        'order':env.Order
                    });
                    var model = _.extend(new Backbone.Model(), spec);
                    model.set({order:{id:2112}});
                    expect(model.get('order')).to.be.an.instanceof(env.Order);
                    expect(model.get("order|id")).to.equal(2112);
                });


                it('can contain additional args', function(){
                    var spec = nestify({
                        'order':{constructor:env.Order,
                                 args: {backordered:"2113-11-29"}}
                    });
                    var model = _.extend(new Backbone.Model(), spec);
                    model.set({order:{id:2112}});
                    expect(model.get("order|backordered")).to.equal("2113-11-29");
                });
            });

            describe('example usage', function(){

                it('properly nests complex JSON into proper Models and Collections', function(){

                    var shoppingCartJSON = 
                            {pending: 
                             {orderID:null,
                              items:[{itemID:"bk28",
                                      qty:25,
                                      desc:"AA batteries"}]},
                             account: 
                             {acctID:55,
                              uname:"bmiob",
                              orders:[
                                  {orderID:1,
                                   items:[{itemID:"cc01",
                                           qty:2,
                                           desc:"meatball"},
                                          {itemID:"cc25",
                                           qty:87,
                                           desc:"rhubarb"}]},
                                  {orderID:2,
                                   items:[{itemID:"sd23",
                                           desc:"SICP"}]}
                              ]}
                            };

                    var shoppingCart = new env.ShoppingCart(shoppingCartJSON);

                    var anItem = shoppingCart.get("account|orders|1|items|0");
                    expect(anItem).to.be.an.instanceof(env.Item);
                    expect(anItem.get("itemID")).to.equal("sd23");
                    expect(shoppingCart.get(["pending","items",0,"itemID"])).to.equal("bk28");
                });
            });
        });
    });
}));
