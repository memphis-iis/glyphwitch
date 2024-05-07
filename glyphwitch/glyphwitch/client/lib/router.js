import {FlowRouter} from 'meteor/kadira:flow-router';

//define the routes for the application
FlowRouter.route('/', {
  name: 'home',
  action() {
    BlazeLayout.render('home');
  }
});

//define an array of unrestricted routes
const unrestricted = ['home', 'newDocument']

for (let route of unrestricted) {
  FlowRouter.route(`/${route}`, {
    name: route,
    action() {
      BlazeLayout.render(route);
    }
  });
}