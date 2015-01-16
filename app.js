//knockout view model
function ViewModel() {
	var self=this;
	
	//ko observables
	self.products=ko.observableArray([]);
	self.startProducts=ko.observableArray([]);
	self.groups=ko.observableArray([]);
	self.currentProduct=ko.observable(null);
	self.route=ko.observable("");
	self.skip=ko.observable(0);
	self.total=ko.observable(0);
	self.detailProduct=ko.observable();
	self.isLoading=ko.observable(true);
	self.rootGroup=ko.observable();
	self.shop=ko.observable();
	
	//helper functions to scroll to top
	/*self.scrollTop=function() {
		window.scrollTo(0,0);
	}*/
	
	//this function does some initializing stuff like scrolling up and set the page title
	self.initPage=function(overideTitle) {
		document.title=overideTitle || self.shop().Name;
		window.scrollTo(0,0);
	}
	
	//a complex observable used for the shopping card
	self.shoppingCard={
		items:ko.observableArray([]),
		total:function() {
			var total=0;
			for(var i=0;i<this.items().length;i++) 
				total+=this.items()[i].Total();
			return(total);
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
	
	Q.all([
		o("Group").filter("Name eq '$root'").first().get(),
		o("Shop").expand("Address").get(),
		o("Product").take(3).filter("IsHighlighted eq true").get()
	]).then(function(oData) {
		
		//set the data which we get from the q.all
		self.rootGroup(oData[0].data);
		self.shop(oData[1].data[0]);
		self.startProducts(oData[2].data);
		self.route("Home");
		
		//init the page
		self.initPage();
		
		
		//+++ initialize the routes +++

		//get top 3 products on start TODO: At filter for best selling!
		o("Product").take(3).route(["","Home"],function(data) {
			self.route("Home");
			self.startProducts(data);
			self.initPage();
		});
		
		
		//product detail
		o("Product").find(0).route("Product/Detail?",function(data) {
			self.route("Detail");
			self.detailProduct(data);
			self.initPage();
			//update the page title for SEO
			self.initPage(this.param[1]+" - "+self.shop().Name);
		});
		
		//get a product list on product click
		/*o("Product").take(9).inlineCount().route("Product",function(data) {
			self.route("Product");
			self.products(data);
			self.skip(0);
			self.total(this.inlinecount);
			self.initPage();
		});*/
		
		//product pagination
		/*o("Product").skip(0).take(9).inlineCount().route("Product/Page?",function(data) {
			self.skip(parseInt(this.param[0]));
			self.route("Product");
			self.products(data);
			self.total(this.inlinecount);
			self.initPage();
		});*/
		
		//get a group list on group click
		//.expand("Group,Product")
		o("ProductGroup").expand("Group,Product").filter("Group/id eq {0}").inlineCount().select("Product,Group").route("Group?",function(data) {
			//self.groups(data);
			if(self.route()!=="Product") {
				self.route("Product");
				//self.initPage(this.param[1]+" - "+self.shop().Name);
				self.initPage();
			}
			console.log(data);
			self.products(data);
			//self.groups(data);
			self.skip(0);
			self.total(this.inlinecount);
			//self.initPage();
		});
		
		
		//get a group list on product click
		o("Group").filter("Parent_fk eq "+self.rootGroup().id).route("Group?",function(data) {
			self.groups(data);
		});
		
		//open the shopping card
		o("").route("Card",function(data) {
			self.route("Card");
			self.initPage();
		});
		
		//+++ initialize view model elements +++
		
		//add to shopping card
		self.addToCard=function(product) {
			//TODO: Check for duplicates!
			//push a temp ProductOrder element into the items. When the order is checked in, we will Post it to the dataservice
			console.log(product);
			self.shoppingCard.items.push({ 
				Amount:ko.observable(1),
				Product:product,
				Total:function() {
					return(this.Amount()*this.Product.PriceOnline);
				},
				Remove:function() {
					var index = self.shoppingCard.items.indexOf(this);
					self.shoppingCard.items.splice(index, 1);
				}
			});
		}
		
		//ready, config the 
		self.isLoading(false);

	}).fail(function(ex) {
		self.isLoading(false);
		console.log(ex);
	});
}

//append the viewmodel
ko.applyBindings(new ViewModel());