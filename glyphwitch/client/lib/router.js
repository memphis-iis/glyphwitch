import {Meteor} from 'meteor/meteor';
import {Accounts} from 'meteor/accounts-base';
import {Roles} from 'meteor/alanning:roles';
import {Template} from 'meteor/templating';



//set default layout to mainLayout
Router.configure({
  layoutTemplate: 'defaultLayout'
});

//set unrestricted routes
unrestrictedRoutes = ['login', 'register'];

//set user routes
userRoutes = ['profile','newGlyph','glyphSearch','uploadDocument','selectDocument','changeEmailPassword','viewPage'];

//set admin routes
adminRoutes = ['admin'];

//create a global onBeforeAction that checks if the user is logged in
Router.onBeforeAction(function() {
  //if the user is not logged in
  if (!Meteor.userId()) {
    //if the route is not unrestricted
    if (unrestrictedRoutes.indexOf(this.route.getName()) == -1) {
      //redirect to the login page
      this.redirect('login');
    }
  } else {
    //if the user is an admin and is the default user (admin), redirect to change password
    if (Roles.userIsInRole(Meteor.userId(), 'admin') && Meteor.user().username == 'admin') {
      console.log('redirecting to changeEmailPassword');
      this.redirect('changeEmailPassword');
    }
    //if the route is a user route
    if (userRoutes.indexOf(this.route.getName()) != -1) {
      //if the user is not an admin
      if (!Roles.userIsInRole(Meteor.userId(), 'admin')) {
        //if the route is an admin route
        if (adminRoutes.indexOf(this.route.getName()) != -1) {
          //redirect to the dashboard
          this.redirect('dashboard');
        }
      }
    }
  }
  //continue to the route
  this.next();
});



//set the routes
//home route, if the user is logged in, redirect to the dashboard
Router.route('/', {
  name: 'home',
  template: 'home',
  onBeforeAction: function() {
    if (Meteor.userId()) {
      this.redirect('viewPage');
    } else {
      this.redirect('login');
    }
  }
});


//logout route, call the logout method
Router.route('/logout', {
  name: 'logout',
  onBeforeAction: function() {
    Meteor.logout();
    this.redirect('login');
  }
});

//viewPage route. It has 2 parameters, the documentId and the page number
Router.route('/viewPage/:documentId/:page', {
  template: 'viewPage',
  data: function() {
    return {
      documentId: this.params.documentId,
      page: this.params.page
    };
  }
});

//combine all routes into one array
allRoutes = unrestrictedRoutes.concat(userRoutes, adminRoutes);

//loop through all the routes
allRoutes.forEach(function(route) {
  //set the route
  Router.route('/'+route, {
    name: route,
    template: route
  });
});
