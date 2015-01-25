function MainViewModel() {
	var self=this;

	//+++ all about the shop. must be loaded on every route
	self.shop=ko.observable();
	self.shopAddress=ko.observable();

	//+++ group observables
	self.groups=ko.observableArray([]); //holds all groups
	self.currentGroup=ko.observable();
	self.rootGroup=ko.computed(function() {
		var match = ko.utils.arrayFirst(self.groups(), function(item) {
		    return '$root' === item.Name;
		});
		if(match){
			return match;
		}
	},self);
	self.firstLevelGroups=ko.computed(function() {
		//console.log("compute firstLevelGroups");
		if(self.rootGroup()){
		    var x = self.groups(), l=x.length, firstGroupLevel = [];
		    for (var i = 0; i < l; i++)
		        if (x[i].Parent_fk === self.rootGroup().id)
		            firstGroupLevel.push(x[i]);
		    //console.log(firstGroupLevel);
	    }
	    return firstGroupLevel;
	}, self);//the first group level
	self.secondLevelGroups=ko.computed(function() {
		console.log("compute secondLevelGroups");
		if(self.firstLevelGroups()){
			var x = self.groups(), l=x.length, secondGroupLevel = [],result=[];
		    for (var i = 0; i < l; i++)
		    	if (self.firstLevelGroups().indexOf(x[i].Parent_fk)>0)
					result=$.grep(self.firstLevelGroups(), function(e){ return e.id == x[i].Parent_fk });
					console.log(result);
		            secondGroupLevel.push(x[i]);
		    console.log(secondGroupLevel);
	    	return secondGroupLevel;
	    } else {
	    	return null;
	    }
	}, self); //the second level from the root group

	//+++ everything about the products
	self.startProducts=ko.observableArray([]); //some highlighted products for marketing purposes
	self.products=ko.observableArray([]); //the temporary products for pagination
	self.detailProduct=ko.observable(); //temporary product for the detail view
	self.detailProductMainImage=ko.observable(); //for the image of the temporary product saved in Product.MainImage_fk

	//+++ observables for logic and pagination
	self.route=ko.observable("");
	self.skip=ko.observable(0);
	self.total=ko.observable(0);
	self.isLoading=ko.observable(true);

	//self.shoppingCart=ko.observable(new ShoppingCartViewModel());
	// a complex observable used for the shopping card
	self.shoppingCart={
		items:ko.observableArray([]),
		total:function() {
			var total=0;
			for(var i=0;i<this.items().length;i++) 
				total+=this.items()[i].Total();
			return(total);
		},
		addItem:function(product) {
			var tmpProductOrder = ko.observable({
				Amount:ko.observable(1),
				Product:product,
				Total:function() {
					return(this.Amount()*this.Product.Price);
				},
				Remove:function() {
					var index = self.shoppingCart.items.indexOf(this);
					self.shoppingCart.items.splice(index, 1);
				}
			});
			var match = ko.utils.arrayFirst(self.shoppingCart.items(), function(item) {
			    return tmpProductOrder().Product.id === item().Product.id;
			});
			var index = self.shoppingCart.items().indexOf(match);
			if(index<0){
				self.shoppingCart.items.push(tmpProductOrder);
			} else {
				var oldProductionOrder = self.shoppingCart.items()[index];
				var newAmount = oldProductionOrder().Amount()+1;
				self.shoppingCart.items()[index] = ko.observable({
					Amount:ko.observable(newAmount),
					Product:product,
					Total:function() {
						return(this.Amount()*this.Product.Price);
					},
					Remove:function() {
						var index = self.shoppingCart.items.indexOf(this);
						self.shoppingCart.items.splice(index, 1);
					}
				});
			}
		}
	}

	//o.js init
	o().config({
		//endpoint:"https://secure.pointsale.de/Service.svc",
		endpoint:"http://localhost:1000/Api.svc",
		username:"PSAPI",
		password:"demo",
		version:3,
		strictMode:true,
		start:function() {
			self.isLoading(true);
		},
		ready:function() {
			self.isLoading(false);
		}
	});


	//this function does some initializing stuff like scrolling up and set the page title
	self.initPage=function(overideTitle) {
		document.title=overideTitle || self.shop().Name;
		window.scrollTo(0,0);

		//fill your startProducts with non highlighted, if there are not enough highlighted in the database
		if(self.startProducts().length < 8 && !self.isLoading()) {
			self.isLoading(true);
			var numberToAdd=8-self.startProducts().length;
			o("Product").take(numberToAdd).filterByList("id", "==", "||", self.startProducts()).get(function(data) {
				//TODO: many push operation after each other are no good practice
				for(var i=0;i<data.length;++i){
					self.startProducts.push(data[i]);
				}
				self.isLoading(false);
			});
		}
		//console.log(self.groups());
		//console.log(self.rootGroup.Name);
	}
	
	Q.all([
		o("Shop").expand("Address").get(),
		o("Group").expand("ProductGroup").get(),
		o("Product").take(8).filter("IsHighlighted eq true").get()
	]).then(function(oData) {
		
		//set the data which we get from the q.all
		self.shop(oData[0].data[0]);
		self.groups(oData[1].data);//call the groups only once and perform on that data
		self.startProducts(oData[2].data);

		self.shopAddress(self.shop().Address[0]);

		self.initPage();

		//+++++++++++++++++++++++++++++
		//+++ initialize the routes +++
		//+++++++++++++++++++++++++++++

		//+++
		//HOME VIEW
		//+++
		o("").route(["","Home"],function(data) {
			self.route("Home");
			self.currentGroup(self.rootGroup);
			self.initPage();
		});

		//+++
		//PRODUCT DETAIL VIEW
		//+++
		o("Product").expand("ProductGroup").find(1).routes("Product/Detail?",function(data) {
			$('body,html').animate({scrollTop: 0}, 500);
			self.route("Detail");
			self.products().removeAll;
			self.detailProduct(data);
		});

		//+++
		//PRODUCTS BY GROUP_ID VIEWS
		//+++
		o("Group").find(1).routes("Product/Group?", function(data) {
			self.isLoading(true);
			self.detailProduct(null);
			self.currentGroup(data);
			self.products().removeAll;
			var currProductGroups = $.grep(self.groups(), function(e){ return e.id == data.id; })[0].ProductGroup;
			if(currProductGroups.length){
				o("Product").expand("ProductGroup").take(9).filterByList("id", "==", "||", currProductGroups).get(function(data) {
					//TODO: many push operation after each other are no good practice
					for(var i=0;i<data.length;++i){
						self.products.push(data[i]);
					}
					//console.log(self.products());
					self.route("Product");
					self.isLoading(false);
				});
			} else {
				self.isLoading(false);
			}
		});
		
		//get a product list on product click
		o("Product").take(12).inlineCount().routes("Product", function(data) {
			self.route("Product");
			self.products(data);
			self.skip(0);
			self.total(this.inlinecount);
		});

		//product pagination
		o("Product").expand("ProductGroup").skip(0).take(9).inlineCount().routes("Product/Page?", function(data) {
			self.skip(parseInt(this.param[0]));
			self.route("Product");
			self.products($.grep(data, function(e){ return e.ProductGroup.Parent_fk == self.currentGroup.id; }));
			self.total(this.inlinecount);
		});

		//open the shopping cart
		o("").route("Cart",function(data) {
			self.route("Cart");
			self.initPage();
		});
		
		//open the contact page
		o("").route("Contact",function(data) {
			self.route("Contact");
			self.initPage();
		});

		//open the disclaimer page
		o("").route("Disclaimer",function(data) {
			self.route("Disclaimer");
			self.initPage();
		});

		//open the terms page
		o("").route("Terms",function(data) {
			self.route("Terms");
			self.initPage();
		});
		
		//+++ initialize view model elements +++

		//format the footer so that all three columns have the same height
		$("#footer-map").width($("#footer-map").closest("div").width());
		var footerContactHeight = $("#footer-contact").height();
		var footerWelcomeHeight = $("#footer-welcome").height();
		if(footerContactHeight>footerWelcomeHeight){
			$("#footer-welcome").height(footerContactHeight);
			$("#footer-map").height(footerContactHeight+25);
		}else{
			$("#footer-contact").height(footerWelcomeHeight);
			$("#footer-map").height(footerWelcomeHeight+25);
		}
		//insert footer map
		var latLong = new google.maps.LatLng(self.shopAddress().Latitude,self.shopAddress().Longitude);
		var footerMapProp = {
			center:latLong,
			zoom:15,
			mapTypeId:google.maps.MapTypeId.ROADMAP
		};
		var mapFooter=new google.maps.Map(document.getElementById("footer-map"),footerMapProp);
		var marker = new google.maps.Marker({
			position: latLong,
			map: mapFooter//,
			//title: self.shop.Name
		});

		//insert contact map
		var contactSocialColumnHeight = $("#contact-social-column").height()-0.1*$("#contact-social-column").height();
		$("#contact-map").height(contactSocialColumnHeight);
		var contactMapProp = {
			center:latLong,
			zoom:12,
			mapTypeId:google.maps.MapTypeId.ROADMAP
		};
		var mapContact=new google.maps.Map(document.getElementById("contact-map"),contactMapProp);
		var marker = new google.maps.Marker({
			position: latLong,
			map: mapContact//,
			//title: self.shop.Name
		});

		//ready, config the 
		self.isLoading(false);

	}).fail(function(ex) {
		self.isLoading(false);
		console.log(ex);
	});
}

//append the viewmodel
ko.applyBindings(new MainViewModel());
