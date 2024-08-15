import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import './collections';

Meteor.startup(() => {
  // welcome message
  console.log('*** GlyphWitch Server ***');
  console.log('Welcome to the GlyphWitch server!');
  //setup roles, admin and user
  if (Meteor.roles.find().count() == 0) {
    console.log('Creating roles');
    Roles.createRole('admin');
    Roles.createRole('user');
  }
  //if there are no admin users, create one with the email 'admin' and the password 'admin'
  if (Meteor.users.find({roles: 'admin'}).count() == 0) {
    //if no admin exists but the admin user does, set the admin role
    if (Meteor.users.findOne({username: 'admin'})) {
      console.log('Setting admin role for user with email "admin"');
      Roles.addUsersToRoles(Meteor.users.findOne({username: 'admin'}), 'admin');
    } else {
      //if no admin user exists, create one
      console.log('Creating admin user with email "admin" and password "admin"');
      Accounts.createUser({
        email: 'admin@example.com',
        password: 'admin',
        username: 'admin'
      });
      Roles.addUsersToRoles(Meteor.users.findOne({username: 'admin'}), 'admin');
    }
  }
});
