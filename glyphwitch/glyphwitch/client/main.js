import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import './lib/router.js';

import './main.html';

//on client startup we subscribe to the all publication and the userData publication
Meteor.startup(() => {
  Documents = new Mongo.Collection('documents');
  References = new Mongo.Collection('references');
  Phonemes = new Mongo.Collection('phonemes');
  Fonts = new Mongo.Collection('fonts');
  Glyphs = new Mongo.Collection('glyphs');
  Discussions = new Mongo.Collection('discussions');
  DynamicFiles = new Mongo.Collection('dynamicFiles');


  Meteor.subscribe('all');
  Meteor.subscribe('userData');
});

//Register the helper functions for the template
//Template for displaying Stats
Template.registerHelper('stats', function() {
  //return a string of the counts of the documents, references, phonemes, fonts, glyphs, and discussions
  console.log("GlyphWitch Stats: " + Documents.find().count() + " documents, " + References.find().count() + " references, " + Phonemes.find().count() + " phonemes, " + Fonts.find().count() + " fonts, " + Glyphs.find().count() + " glyphs, " + Discussions.find().count() + " discussions.");
  return "GlyphWitch Stats: " + Documents.find().count() + " documents, " + References.find().count() + " references, " + Phonemes.find().count() + " phonemes, " + Fonts.find().count() + " fonts, " + Glyphs.find().count() + " glyphs, " + Discussions.find().count() + " discussions.";
});

Template.registerHelper('allGlyphs', function() {
  console.log("Returning all glyph URLs");
  var glyphURLs = [];
  allGlyphs = Glyphs.find();
  allGlyphs.forEach(function(glyph) {
    glyphURLs.push(glyph.url);
  });
});


//newGlyph template variables
Template.newGlyph.onCreated(function() {
  console.log("newGlyph created");
  Template.instance().drawing = new ReactiveVar(false);
});

//newGlyph template events.
Template.newGlyph.events({
  //canvas when mouse down, set drawing to true
  'mousedown canvas'(event, instance) {
    console.log("mousedown");
    instance.drawing.set(true);
    //overlay a grid on the canvas
    const context = event.target.getContext('2d');
    context.strokeStyle = 'black';
    context.lineWidth = 1;
  },
  //canvas when mouse up, set drawing to false
  'mouseup canvas'(event, instance) {
    console.log("mouseup");
    instance.drawing.set(false);
  },
  //canvas when drawing is active, change the color of the pixel to black
  'mousemove canvas'(event, instance) {
    if (instance.drawing.get()) {
      console.log("mousemove");
      const context = event.target.getContext('2d');
      context.fillStyle = 'black';
      //the brush size should be 20x20 pixels
      context.fillRect(event.offsetX, event.offsetY, 10, 10);
    }
  },
  'click #clearCanvas'(event, instance) {
    console.log("clearCanvas");
    const context = $('#glyphCanvas')[0].getContext('2d');
    context.clearRect(0, 0, 200, 200);
  },
  'click #saveGlyph'(event, instance) {
    console.log("saveGlyph");
    const canvas = $('#glyphCanvas')[0];
    const img = canvas.toDataURL('image/png');
    Meteor.call('addGlyphFromDataURL', img, function(error, result) {
      if (error) {
        console.log(error);
        alert('Error saving glyph');
      } else {
        console.log(result);
      }
    });
  }
});