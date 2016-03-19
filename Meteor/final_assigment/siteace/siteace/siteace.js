Websites = new Mongo.Collection("websites");

addIndex = function(json) { 
   
    for(var i = 0; i < json.length; i++) 
            {
                var obj = json[i];
                 json[i]['index']=i+1;
                console.log( json[i]['index']);
            }
    
    return json;
    
    }
    
 isValidUrl = function (url) {

	var myUrl = url;
	if (/^(http|https):\/\/[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/i.test(myUrl)) {
	  return true;
	} else {
	  return false;
	}   
}
    
if (Meteor.isClient) {

	/////
	// template helpers 
	/////

Template.registerHelper('formatDate', function(date1) {
    console.log(typeof(date1) + "date")
    return  date1.toLocaleDateString();
});


	// helper function that returns all available websites
	Template.website_list.helpers({
        
        searchedBy:function () {
         return Session.get('txtsearch');
        },
        
		websites:function(){
            
            
            if(Session.get('txtsearch') &&  Session.get('txtsearch').length > 1)
            {
                var _q =Session.get('txtsearch');
                //$or: [ { quantity: { $lt: 20 } }, { price: 10 } ] }
                var json = Websites.find({$or: [{"title": { $regex: _q, $options: "i" }},
                                         {"description": { $regex: _q, $options: "i"}}]}).fetch();
                if(json.length == 0){json = Websites.find({"title": {'$regex' : '.*' + _q + '.*'}}).fetch();}
                json = addIndex(json);
                 return json;
                

            }
            else if(Session.get('txtsearch') &&  Session.get('txtsearch').length == 1)
            {Session.set('txtsearch', undefined)}
            
            var json = Websites.find({},{sort:{upvote:-1}}).fetch();
           json= addIndex(json);
             
            
     
            
			return json; //Websites.find({},{sort:{upvote:-1}});
		}
        
        
	});

   Template.website_item.helpers({
    'votecolor': function(vote){
        var _color="#000000";
        console.log(" color " + vote);
        if(vote < 0){_color="#ff0000";}
        else if (vote > 0){ _color="#006600";}
        return _color;
    },
    createRow: function(index){
        var rtn=false;
        if( (index==1 || (index%3)==0) && index!=3 ){rtn=true;}
        return rtn;
    },
    closeRow: function(index){
        var rtn=false;
        if( ( (index%3)==0) ){rtn=true;}
        return rtn;
    },
    sRow: function(index){
        return new Handlebars.SafeString('<div class="row">');
    },
    eRow: function(index){
        return new Handlebars.SafeString('</div>');
    }
    
});
Template.website_list.helpers({
    'warn': function(vote){
        var _rtn =false;
        $(".alert-dismissible").hide();
        if(Session.get('txtsearch') &&  Session.get('txtsearch').length > 1)
        { _rtn =true;$(".alert-dismissible").show();}
         return _rtn;
    }
});
	/////
	// template events 
	/////
   Template.search_wsite.events({
        "click .js-search":function(event){
           
            console.log("searching 7");
            Session.set('txtsearch', $("#searchbytext").val());
        
          //  $(".js-search-trigger" ).trigger( "click" );
            return false;
        } 
	 
   });
   Template.website_list.events({
      'click .js-clear-search': function (event){
          Session.set('txtsearch', undefined);
          $("#searchbytext").val("");
      }
       
   });
	Template.website_item.events({
		"click .js-upvote":function(event){
			// example of how you can access the id for the website in the database
			// (this is the data context for the template)
			var website_id = this._id;
            Websites.update(
                  { _id: website_id },{ $inc: { upvote: 1 } }
              );
			console.log("Up voting website with id "+website_id);
			// put the code in here to add a vote to a website!

			return false;// prevent the button from reloading the page
		},
      	"click .js-downvote":function(event){

			// example of how you can access the id for the website in the database
			// (this is the data context for the template)
			var website_id = this._id;
			Websites.update(
                  { _id: website_id },{ $inc: { dwnvote: 1 } }
              );
            
            console.log("Down voting website with id "+website_id);

			// put the code in here to remove a vote from a website!

			return false;// prevent the button from reloading the page
		},
         "click .js-search-trigger":function(event){
           console.log("trigger");
         return false;
       }
	})

	Template.website_form.events({
		"click .js-toggle-website-form":function(event){
			$("#website_form").toggle('slow');
		}, 
        "blur #url":function (event) {
            var web_url = $("#url").val();
           if( !isValidUrl(web_url) ) 
           {
                alert("Please enter a valid URL. http:// or  https://  required.");
				return false;
            }
            Meteor.call("remoteGetUrl", web_url, {}, function(error, response) {
                if (error) {
                        console.log("Error: " + error);
                        $("#title").removeAttr("disabled");
                        $("#description").removeAttr("disabled");
                         
                    }
                 else {
                     $("#title").removeAttr("disabled");
                      $("#description").removeAttr("disabled");
                      $("#title").val( $(response.content).filter('title').text());
                      $("#description").val( $(response.content).filter('meta[name="description"]').attr("content"));
                        
                 }
                 return false;
            });
        },
		"submit .js-save-website-form":function(event){
             // create Json Doc
            var _website={  
                title:event.target.title.value,
                url:event.target.url.value,
                description: event.target.description.value, 
                createdOn:new Date(),
                vote:0      
            };
			console.log("---" + _website.title);
			//insert into collection
            Websites.insert(_website);
            $("#website_form").toggle('slow');
            event.target.title.value="";
            event.target.url.value="";
            event.target.description.value="";
            
            
            
			
			return false;// stop the form submit from reloading the page

		}
	});
}


if (Meteor.isServer) {
	// start up function that creates entries in the Websites databases.
    Meteor.methods({
    "remoteGetUrl": function(url, options) {
      
        return HTTP.get(url, options);
    }
});
  Meteor.startup(function () {
    // code to run on server at startup
    if (!Websites.findOne()){
    	console.log("No websites yet. Creating starter data.");
    	  Websites.insert({
    		title:"Goldsmiths Computing Department", 
    		url:"http://www.gold.ac.uk/computing/", 
    		description:"This is where this course was developed.", 
    		createdOn:new Date(),
            upvote:0,
            dwnvote:0
            
    	});
    	 Websites.insert({
    		title:"University of London", 
    		url:"http://www.londoninternational.ac.uk/courses/undergraduate/goldsmiths/bsc-creative-computing-bsc-diploma-work-entry-route", 
    		description:"University of London International Programme.", 
    		createdOn:new Date(),
            upvote:0,
            dwnvote:0
    	});
    	 Websites.insert({
    		title:"Coursera", 
    		url:"http://www.coursera.org", 
    		description:"Universal access to the world’s best education.", 
    		createdOn:new Date(),
            upvote:0,
            dwnvote:0
    	});
    	Websites.insert({
    		title:"Google", 
    		url:"http://www.google.com", 
    		description:"Popular search engine.", 
    		createdOn:new Date(),
            upvote:0,
            dwnvote:0
    	});
        
        console.log(Websites.find({}));
    }
  });
}
