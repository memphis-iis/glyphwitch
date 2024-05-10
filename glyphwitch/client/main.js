import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FilesCollection } from 'meteor/ostrio:files';
import { Session } from 'meteor/session';
import './lib/router.js';

import './main.html';

Documents = new Mongo.Collection('documents');
References = new Mongo.Collection('references');
Phonemes = new Mongo.Collection('phonemes');
Fonts = new Mongo.Collection('fonts');
Glyphs = new Mongo.Collection('glyphs');
Discussions = new Mongo.Collection('discussions');
Files = new FilesCollection({collectionName: 'files'});

//on client startup we subscribe to the all publication and the userData publication
Meteor.startup(() => {


  Meteor.subscribe('files.images.all');
  Meteor.subscribe('all');
  Meteor.subscribe('userData');
});

//Register the helper functions for the template
//Template for displaying Stats
Template.registerHelper('stats', function() {
  //return a string of the counts of the documents, references, phonemes, fonts, glyphs, and discussions
  return "GlyphWitch Stats: " + Documents.find().count() + " documents, " + References.find().count() + " references, " + Phonemes.find().count() + " phonemes, " + Fonts.find().count() + " fonts, " + Glyphs.find().count() + " glyphs, " + Discussions.find().count() + " discussions.";
});

//Template for displaying all glyphs 
Template.registerHelper('allGlyphs', function() {
  //return all the glyphs from the database
  return Glyphs.find();
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

Template.selectDocument.onCreated(function() {
  console.log("selectDocument created");
  //reactive variable to store the current document
  Session.set('currentDocument', false);
});

Template.selectDocument.helpers({
  documents() {
    return Documents.find().fetch();
  },
  currentDocument() {
    documentId = Session.get('currentDocument');
    if (documentId) {
      return Documents.findOne(documentId);
    } else {
      return false;
    }
  }
});

Template.selectDocument.events({
  'change #documentSelect'(event, instance) {
    console.log("documentSelect to " + event.target.value);
    Session.set('currentDocument', event.target.value);
  }
});

//allglyphs template events
Template.allGlyphs.events({
  //when a glyph is clicked, set the selectedGlyph to the glyph that was clicked
  'click #deleteGlyph'(event, instance) {
   //get the glyph id from the data-id attribute
    const glyphId = $(event.target).attr('data-id');
    //call the removeGlyph method
    Meteor.call('removeGlyph', glyphId, function(error, result) {
      if (error) {
        console.log(error);
        alert('Error deleting glyph');
      } else {
        console.log(result);
      }
    });
  }
});

//upload document onCreated function
Template.uploadDocument.onCreated(function() {
  this.currentUpload = new ReactiveVar(false);
});

//upload document helpers
Template.uploadDocument.helpers({
  currentUpload() {
    return Template.instance().currentUpload.get();
  }
});

//upload document template events
Template.uploadDocument.events({
  //when the form is submitted, use files-collection to get the file and call the addDocument method
  'click #submitDocument'(event, template) {
    console.log("submitDocument");
    event.preventDefault();
    const author = $('#author').val();
    const title = $('#title').val();
    const file = $('#fileInput').get(0).files[0];
    console.log("Filename: " + file.name + ". Author: " + author + ". Title: " + title + ".");
    if (file) {
      const upload = Files.insert({
        file: file,
        chunkSize: 'dynamic'
      }, false);

      upload.on('end', function(error, fileObj) {
        if (error) {
          console.log(error);
          alert('Error uploading file');
        } else {
          console.log(fileObj);
          Meteor.call('addDocument', fileObj._id, author, title, function(error, result) {
            if (error) {
              console.log(error);
              alert('Error adding document');
            } else {
              console.log(result);
            }
          });
        }
      });
      upload.start();
    }
  }
});