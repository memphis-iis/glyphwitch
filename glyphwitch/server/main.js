import { Meteor } from 'meteor/meteor';
import './collections';

Meteor.startup(() => {
  // welcome message
  console.log('*** GlyphWitch Server ***');
  console.log('Welcome to the GlyphWitch server!');
});
