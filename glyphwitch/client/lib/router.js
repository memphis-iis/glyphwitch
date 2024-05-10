//import the FlowRouter package ositro
import { FlowRouter } from 'meteor/ostrio:flow-router-extra';
//define the routes for the application
FlowRouter.route('/', {
  name: 'home',
  action() {
    FlowRouter.go('home');
  }
});

//define an array of unrestricted routes
const unrestricted = ['home', 'newDocument']

for (let route of unrestricted) {
  FlowRouter.route(`/${route}`, {
    name: route,
    action() {
      FlowRouter.go(route);
    }
  });
}