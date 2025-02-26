import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FilesCollection } from 'meteor/ostrio:files';
import { Session } from 'meteor/session';
import Cropper from 'cropperjs';
import go from 'gojs';
import './views/versionInfo.js';


import './main.html';

Documents = new Mongo.Collection('documents');
References = new Mongo.Collection('references');
Phonemes = new Mongo.Collection('phonemes');
Fonts = new Mongo.Collection('fonts');
Glyphs = new Mongo.Collection('glyphs');
Discussions = new Mongo.Collection('discussions');
Files = new FilesCollection({collectionName: 'files'});
import './lib/router.js';


//on client startup we subscribe to the all publication and the userData publication
Meteor.startup(() => {


  Meteor.subscribe('files.images.all');
  Meteor.subscribe('all');
  Meteor.subscribe('userData');
});


//gLobal helpers
Template.registerHelper('isAdmin', function() {
  //return true if the user is an admin
  return Roles.userIsInRole(Meteor.userId(), 'admin') && Meteor.userId();
});

Template.registerHelper('isUser', function() {
  //return true if the user is not an admin
  return !Roles.userIsInRole(Meteor.userId(), 'admin') && Meteor.userId();
});

Template.registerHelper('isLoggedIn', function() {
  //return true if the user is logged in
  return Meteor.userId();
});

//user information
Template.registerHelper('currentUser', function() {
  //return the user's email
  user = Meteor.user();
  user.email = user.emails[0].address;
  return user;
});

//isequal helper
Template.registerHelper('isEqual', function(a, b) {
  //return true if a is equal to b
  return a == b;
});


//Template for displaying Stats
Template.registerHelper('stats', function() {
  //return a string of the counts of the documents, references, phonemes, fonts, glyphs, and discussions
  return "GlyphWitch Stats: " + Documents.find().count() + " documents, " + References.find().count() + " references, " + Phonemes.find().count() + " phonemes, " + Fonts.find().count() + " fonts, " + Glyphs.find().count() + " glyphs, " + Discussions.find().count() + " discussions.";
});

//Template Helper to display version info session variable
Template.registerHelper('version', function() {
  //return the version info
  ver = Session.get('versionInfo').releaseName;
  //remove everything after the second to last -
  ver = ver.substring(0, ver.lastIndexOf('-'));
  ver =  ver.substring(0, ver.lastIndexOf('-'));
  return ver;
});

//Templat helper to display current year
Template.registerHelper('currentYear', function() {
  //return the current year
  return new Date().getFullYear();
});


//login template (handles login and signup)
Template.login.events({
  //when the login form is submitted
  'click #login-btn'(event, instance) {
    console.log("login");
    event.preventDefault();
    //get the email and password from the form
    const email = $('#email1').val();
    const password = $('#password1').val();
    //call the login method
    Meteor.loginWithPassword(email, password, function(error, result) {
      if (error) {
        console.log(error);
        alert('Error logging in: ' + error.reason);
      } else {
        console.log(result);
        //if the username is 'admin', redirect to the changeEmailPassword route
        if (Meteor.user().username == 'admin' && Meteor.user().emails[0].address == 'admin@example.com') {
          Router.go('changeEmailPassword');
        } else {
          //otherwise, redirect to the dashboard
          Router.go('/viewPage');
        }
      }
    });
  },
  //when the signup form is submitted
  'click #signup'(event, instance) {
    event.preventDefault();
    console.log("signup");
    //get the email and password from the form
    const email = $('#email2').val();
    const password = $('#password2').val();
    //if these are empty, alert the user
    if (!email || !password) {
      alert('Email and password are required');
      return;
    }
    console.log("calling createNewUser with email " + email + " and password " + password);
    //call the createUser method
    Meteor.call('createNewUser', email, password, function(error, result) {
      if (error) {
        console.log(error);
        alert('Error signing up: ' + error.join(', '));
      } else {
        //if the return is an array, its an error
        if (result instanceof Array) {
          alert('Error signing up: ' + result.join(', '));
        } else {
          console.log(result);
        }
      }
    });
    //login the user
    Meteor.loginWithPassword(email, password, function(error, result) {
      if (error) {
        console.log(error);
      } else {
        console.log(result);
        //redirect to viewPage
        Router.go('/viewPage');
      }
    });
  }
});

//Template for changeEmailPassword
Template.changeEmailPassword.events({
  //when the form is submitted
  'click #changeEmailPassword'(event, instance) {
    event.preventDefault();
    console.log("changeEmailPassword");
    //get the email and password from the form
    const curEmail = $('#currentEmail').val();
    const email = $('#newEmail').val();
    const password = $('#newPassword').val();
    //call the changeEmailPassword method
    Meteor.call('changeEmailPassword', curEmail, password, email, function(error, result) {
      if (error) {
        console.log(error);
        alert('Error changing email/password');
      } else {
        console.log(result);
        //redirect to the dashboard
        Router.go('dashboard');
      }
    });
  }
});

//Template for the searchGlyphs
Template.searchGlyphs.onCreated(function() {
  console.log("newGlyph created");
  Template.instance().drawing = new ReactiveVar(false);
  Template.instance().glyphs = new ReactiveVar(false);
});

//searchGlyphs template helpers
Template.searchGlyphs.helpers({
  //return the glyphs
  glyphs() {
    return Template.instance().glyphs.get();
  }
});

//newGlyph template events.
Template.searchGlyphs.events({
  //canvas when mouse down, set drawing to true
  'mousedown #searchCanvas'(event, instance) {
    console.log("mousedown");
    instance.drawing.set(true);
    //overlay a grid on the canvas
    const context = event.target.getContext('2d');
    context.strokeStyle = 'black';
    context.lineWidth = 1;
  },
  //canvas when mouse up, set drawing to false
  'mouseup #searchCanvas'(event, instance) {
    console.log("mouseup");
    instance.drawing.set(false);
  },
  //canvas when drawing is active, change the color of the pixel to black
  'mousemove #searchCanvas'(event, instance) {
    if (instance.drawing.get()) {
      console.log("mousemove");
      const context = event.target.getContext('2d');
      context.fillStyle = 'black';
      //the brush size should be 20x20 pixels
      context.fillRect(event.offsetX, event.offsetY, 10, 10);
    }
  },
  'click #clearSearchCanvas'(event, instance) {
    console.log("clearCanvas");
    const context = $('#searchCanvas')[0].getContext('2d');
    context.clearRect(0, 0, 200, 200);
    //clear the glyphs
    instance.glyphs.set(false);
  },
  'click #searchGlyph'(event, instance) {
    console.log("saveGlyph");
    const canvas = $('#searchCanvas')[0];
    const img = canvas.toDataURL('image/png');
    Meteor.call('findNearbyGlyphsFromDataURL', img, 10, function(error, result) {
      if (error) {
        console.log(error);
        alert('Error searching for glyphs or no glyphs found');
      } else {
        console.log(result);
        instance.glyphs.set(result);
      }
    });
  }
});


//Template for displaying all glyphs 
Template.registerHelper('allGlyphs', function() {
  //return all the glyphs from the database
  glyphs = Glyphs.find();
  if (glyphs.count() > 0) {
    return glyphs
  } else {
    return false;
  }
});




//newGlyph template variables
Template.newGlyph.onCreated(function() {
  console.log("newGlyph created");
  Template.instance().drawing = new ReactiveVar(false);
});

//newGlyph template events.
Template.newGlyph.events({
  //canvas when mouse down, set drawing to true
  'mousedown #glyphCanvas'(event, instance) {
    console.log("mousedown");
    instance.drawing.set(true);
    //overlay a grid on the canvas
    const context = event.target.getContext('2d');
    context.strokeStyle = 'black';
    context.lineWidth = 1;
  },
  //canvas when mouse up, set drawing to false
  'mouseup #glyphCanvas'(event, instance) {
    console.log("mouseup");
    instance.drawing.set(false);
  },
  //canvas when drawing is active, change the color of the pixel to black
  'mousemove #glyphCanvas'(event, instance) {
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
        //clear the canvas
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, 200, 200);
      }
    });
  },
});

Template.selectDocument.onCreated(function() {
  console.log("selectDocument created");
  Template.instance().currentDocument = new ReactiveVar(false);
  this.setDocument = new ReactiveVar(Template.currentData().setDocument);
  this.setPage = new ReactiveVar(Template.currentData().setPage);
});

Template.selectDocument.helpers({
  documents() {
    console.log(Template.instance().data);
    ret = Documents.find().fetch();
    console.log(ret);
    return ret;
  },
  currentDocument() {
    const instance = Template.instance();
    documentId = instance.currentDocument.get();
    console.log("currentDocument is " + documentId);
    if (documentId) {
      doc = Documents.findOne({_id: documentId});
      //for each pages, get the images from the files collection
      console.log(doc);
      doc.pages.forEach(function(page) {
        page.image = Files.findOne({_id: page.pageId}).link();
      });
      return doc;

    } else {

      return false;
    }
  }
});

Template.selectDocument.events({
  'click #selectDoc'(event, trigger) {
    console.log("documentSelect to " + event.target.value);
    fn = Template.instance().setDocument.get();
    fn(event.target.value);
    fn2 = Template.instance().setPage.get();
    fn2(0);
  
    
  },
  'change #selectDoc'(event, instance) {
    const newDoc = event.target.value;
    const setDocumentFn = instance.setDocument.get();
    setDocumentFn(newDoc);
    const setPageFn = instance.setPage.get();
    setPageFn(0);
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

//template for viewPage
Template.viewPage.onCreated(function() {
  console.log("viewPage created");
  //get the current Page and current Document from the Iron Router variables
  Template.instance().currentLine = new ReactiveVar(false);
  //set the global variables
  Template.instance().currentDocument = new ReactiveVar();
  Template.instance().currentPage = new ReactiveVar();
  Template.instance().currentLine = new ReactiveVar(false);
  Template.instance().currentWord = new ReactiveVar();
  Template.instance().currentPhoneme = new ReactiveVar()
  Template.instance().currentSentence = new ReactiveVar();
  Template.instance().currentGlyph = new ReactiveVar();
  Template.instance().currentDiscussion = new ReactiveVar();
  Template.instance().currentTool =  new ReactiveVar('view');
  Template.instance().currentView = new ReactiveVar('simple');
  Template.instance().subTool = new ReactiveVar(false);
  Template.instance().currentHelp = new ReactiveVar("You can use [Shift] + Scroll to zoom in and out of the page image.");
  Template.instance().drawing = new ReactiveVar(false);
  Template.instance().selectx1 = new ReactiveVar(false);
  Template.instance().selecty1 = new ReactiveVar(false);
  Template.instance().selectwidth = new ReactiveVar(false);
  Template.instance().selectheight = new ReactiveVar(false);
  Template.instance().originalImage = new ReactiveVar(false);
  Template.instance().yScaling = new ReactiveVar(1);
  Template.instance().xScaling = new ReactiveVar(1);
  Template.instance().cropper = new ReactiveVar(false);
  Template.instance().discussions = new ReactiveVar(
    {
      "document": false,
      "page": false,
      "line": false,
      "word": false,
      "phoneme": false,
      "glyph": false
    }
  );
  Template.instance().x = new ReactiveVar(false);
  Template.instance().y = new ReactiveVar(false);

});

//Onrendered function for viewPage
Template.viewPage.onRendered(function() {
  //if the currentDocument is false, show the openModal
  if (!Template.instance().currentDocument.get()) {
    console.log("No document selected");
    $('#openModal').modal('show');
  } else {
    $('#openModal').modal('hide');
    currentPage = Te  
    currentDocument = Template.instance().currentDocument.get();
    console.log("currentDocument is " + currentDocument);
    console.log("currentPage is " + currentPage);
    instance = Template.instance();
    instance.currentDocument.set(currentDocument);
    instance.currentPage.set(currentPage);
  }
  
});



//function to reset all buttons in toolbox-container to btn-light
function resetToolbox() {
  currentTool = Template.instance().currentTool.get();
  currentView = Template.instance().currentView.get();
  console.log("resetToolbox, currentTool is " + currentTool, " and currentView is " + currentView);
  toolbox = $('.toolbox-container');
  //get the first child div of the toolbox-container
  firstChild = toolbox.children().first();
  //get the buttons in the first child and hide them and remove the btn-dark class
  buttons = firstChild.children();
  $(buttons).each(function(index, button) {
    if ($(button).attr('id') != 'exitTool' && $(button).attr('id') != 'confirmTool') {
      $(button).removeClass('btn-dark').addClass('btn-light');
    }
  });
  //if currentTool is not false, enable the exitTool
  if (currentView == 'simple') {
    if(currentTool == 'view') {
      hideAllToolButtons();
      $('#viewTool').removeClass('btn-light').addClass('btn-dark');
      //show the viewTool, createReference, createLine, searchGlyphs, and selectTool
      $('#viewTool').show();
      $('#createReference').show();
      $('#createLine').show();
      $('#searchGlyphs').show();
      $('#selectItem').show();
    }
    if(currentTool == 'createLine') {
      hideAllToolButtons();
      $('#exitTool').show();
      $('#confirmTool').show();
    }
    if(currentTool == 'select') {
      hideAllToolButtons();
      $('selectItem').removeClass('btn-light').addClass('btn-dark');
      $('#exitTool').show();
    }
   } else if (currentView == 'line') {
    if(currentTool == 'view') {
      hideAllToolButtons();
      //show the viewTool, createWord,  selectTool, and viewTool
      $('#viewTool').show();
      $('#createWord').show();
      $('#selectItem').show();
      $('#viewTool').removeClass('btn-light').addClass('btn-dark');
    } 
    if(currentTool == 'select') {
      hideAllToolButtons();
      $('selectTool').removeClass('btn-light').addClass('btn-dark');
      $('#exitTool').show();
    }
    if(currentTool == 'createWord') {
      hideAllToolButtons();
      $('#createWord').removeClass('btn-light').addClass('btn-dark');
      $('#exitTool').show();
      $('#confirmTool').show();
    }
  } else if(currentView == 'word') {
      if(currentTool == 'view') {
        hideAllToolButtons();
        $('.toolbox-container button').removeClass('btn-dark').addClass('btn-light')
        //show createPhoneme, selectItem, createGlyph, and viewTool
        $('#createPhoneme').show();
        $('#selectItem').show();
        $('#createGlyph').show();
        $('#viewTool').show();
        $('#viewTool').removeClass('btn-light').addClass('btn-dark');
    } 
    if(currentTool == 'createPhoneme') {
      $('#createPhoneme').removeClass('btn-light').addClass('btn-dark');
      $('#exitTool').show();
      $('#confirmTool').show();
    }
    if(currentTool == 'createGlyph') {
      hideAllToolButtons();
      $('#selectItem').removeClass('btn-light').addClass('btn-dark');
      $('#exitTool').show();
      $('#confirmTool').show();
    }
  } else if(currentView == 'glyph') {
      if(currentTool == 'view') {
        hideAllToolButtons();
        $('.toolbox-container button').removeClass('btn-dark').addClass('btn-light')
        // Show view tool, selectItem, and createElement for glyph view
        $('#viewTool').show();
        $('#selectItem').show();
        $('#createElement').show();
        $('#viewTool').removeClass('btn-light').addClass('btn-dark');
      } else if(currentTool == 'select') {
        hideAllToolButtons();
        $('#selectItem').removeClass('btn-light').addClass('btn-dark');
        $('#exitTool').show();
      } else if(currentTool == 'createElement') {
        hideAllToolButtons();
        $('#createElement').removeClass('btn-light').addClass('btn-dark');
        $('#exitTool').show();
        $('#confirmTool').show();
      }
  }
}

//fucntion to generate document flow using gojs
function generateFlow() {

  myDiagram = new go.Diagram("flow", {
    initialContentAlignment: go.Spot.Center,
    "undoManager.isEnabled": true
    }
  );

  doc = Documents.findOne({_id: Template.instance().currentDocument.get()});

  //create node templates for the document, pages, lines, words, phonemes, glyphs, and references
  myDiagram.nodeTemplate = new go.Node('Auto')
     .add(
        new go.Shape('RoundedRectangle', { fill: 'lightblue' }),
        new go.TextBlock({ margin: 8 },
          new go.Binding('text', 'key')
        )
      );







  //for each document, create a node, keeping parent connections
  doc = Documents.findOne({_id: Template.instance().currentDocument.get()});
  console.log(doc);

  //create a object to hold the nodes
  nodes = [];
  links = [];

  //create a node for the document
  nodes.push({ key: doc.title, category: "document" });

  //for each page, create a node, keeping parent connections and creating a link
  doc.pages.forEach(function(page, index) {
    nodes.push({ key: doc.title + ' page ' + index, category: "page", parent: doc.title });
    links.push({ from: doc.title, to: doc.title + ' page ' + index });
  });


  //for each line, create a node, keeping parent connections to the page and creating a link
  doc.pages.forEach(function(page, pageIndex) {
    page.lines.forEach(function(line, lineIndex) {
      nodes.push({ key: doc.title + ' page ' + pageIndex + ' line ' + lineIndex, category: "line", parent: doc.title + ' page ' + pageIndex });
      links.push({ from: doc.title + ' page ' + pageIndex, to: doc.title + ' page ' + pageIndex + ' line ' + lineIndex });
    });
  });

  //for each word, create a node, keeping parent connections to the line and creating a link
  doc.pages.forEach(function(page, pageIndex) {
    page.lines.forEach(function(line, lineIndex) {
      line.words.forEach(function(word, wordIndex) {
        nodes.push({ key: doc.title + ' page ' + pageIndex + ' line ' + lineIndex + ' word ' + wordIndex, category: "word", parent: doc.title + ' page ' + pageIndex + ' line ' + lineIndex });
        links.push({ from: doc.title + ' page ' + pageIndex + ' line ' + lineIndex, to: doc.title + ' page ' + pageIndex + ' line ' + lineIndex + ' word ' + wordIndex });
      });
    });
  });


  //set the model
  myDiagram.model = new go.GraphLinksModel(nodes, links);



}

function hideAllToolButtons() {
  //hide all buttons in the toolbox-container, even if in a div
  $('.toolbox-container button').hide();
}


//function to set pageImage to a line, word, phoneme, or glyph
function setImage(type, id) {
  //delete any images with img-fluid class
  $('#pageImage').parent().children('img.img-fluid').remove();

  currentDocument = Template.instance().currentDocument.get();
  currentPage = Template.instance().currentPage.get();
  doc = Documents.findOne({_id: currentDocument});
  //delete any canvas elements
  $('#pageImage').parent().children('canvas').remove();
  if(type == 'line') {
    pageImage = $('#pageImage');
    imagesrc = $('#pageImage').attr('src');
    //create a new image as a copy of the pageImage
    const image = new Image();
    image.src = imagesrc;
    //get the currentDocument
    //get the line from the currentDocument
    line = doc.pages[currentPage].lines[id];
    canvas = document.createElement('canvas');
    //set the canvas width and height to the line width and height
    canvas.width = line.width;
    canvas.height = line.height;
    //get the context of the canvas
    context = canvas.getContext('2d');
    //draw the line on the canvas
    context.drawImage(image, line.x1, line.y1, line.width, line.height, 0, 0, line.width, line.height);
    //get the dataURL of the canvas
    dataURL = canvas.toDataURL('image/png');
    //clone the pageImage
    clone = pageImage.clone();
    clone.attr('id', 'lineImage');
    //set the clone src to the dataURL
    clone.attr('src', dataURL);
    //remove all classes from the clone
    clone.removeClass();
    //add img-responsive class to the clone
    clone.addClass('img-fluid');
    //remove all styles from the clone
    clone.removeAttr('style');
    //append the clone to the parent of the pageImage
    pageImage.parent().append(clone);
    //show the clone
    clone.show();
    //hide the pageImage
    pageImage.hide();
    //set the currentLine to the line
    Template.instance().currentLine.set(id);


  }
  if(type == 'word') {
      lineImg = $('#lineImage');
      imagesrc = $('#lineImage').attr('src');
      //get the dom element with the id 'lineImage'
      const image = new Image();
      image.src = imagesrc;
      //get the image width and height
      imageWidth = image.width;
      imageHeight = image.height;
      //get the currentDocument
      //get the line from the currentDocument
      lineImage = $('#lineImage');
      currentLine = Template.instance().currentLine.get();
      line = doc.pages[currentPage].lines[currentLine];
      word = line.words[id];
      canvas = document.createElement('canvas');
      //set the canvas width and height to the line width and height
      canvas.width = word.width;
      canvas.height = line.height;
      //get the context of the canvas
      context = canvas.getContext('2d');
      //draw the line on the canvas
      context.drawImage(image, word.x, 0, word.width, line.height, 0, 0, word.width, line.height);
      //get the dataURL of the canvas
      dataURL = canvas.toDataURL('image/png');
      //clone the pageImage
      clone = pageImage.clone();
      clone.attr('id', 'wordImage');
      //set the clone src to the dataURL
      clone.attr('src', dataURL);
      //remove all classes from the clone
      clone.removeClass();
      //add img-responsive class to the clone
      clone.addClass('img-fluid');
      //remove all styles from the clone
      clone.removeAttr('style');
      //append the clone to the parent of the pageImage
      pageImage.parent().append(clone);
      //show the clone
      clone.show();
      //hide the pageImage
      pageImage.hide();
      lineImage.hide();
      //set the currentLine to the line

      Template.instance().currentWord.set(id);
  }
  if(type == 'glyph') {
      wordImg = $('#wordImage');
      imagesrc = $('#wordImage').attr('src');
      //get the dom element with the id 'wordImage'
      const image = new Image();
      image.src = imagesrc;
      //get the image width and height
      imageWidth = image.width;
      imageHeight = image.height;
      //get the currentDocument
      //get the word from the currentDocument
      wordImage = $('#wordImage');
      currentLine = Template.instance().currentLine.get();
      currentWord = Template.instance().currentWord.get();
      line = doc.pages[currentPage].lines[currentLine];
      word = line.words[currentWord];
      // Check if we should use glyphs or glyph property
      const glyphsArray = word.glyphs || word.glyph || [];
      glyph = glyphsArray[id];
      canvas = document.createElement('canvas');
      //set the canvas width and height to the glyph width and height
      canvas.width = glyph.width;
      canvas.height = line.height;
      //get the context of the canvas
      context = canvas.getContext('2d');
      //draw the glyph on the canvas
      context.drawImage(image, glyph.x, 0, glyph.width, line.height, 0, 0, glyph.width, line.height);
      //get the dataURL of the canvas
      dataURL = canvas.toDataURL('image/png');
      //clone the pageImage
      clone = pageImage.clone();
      clone.attr('id', 'glyphImage');
      //set the clone src to the dataURL
      clone.attr('src', dataURL);
      //remove all classes from the clone
      clone.removeClass();
      //add img-fluid class to the clone
      clone.addClass('img-fluid');
      //remove all styles from the clone
      clone.removeAttr('style');
      //append the clone to the parent of the pageImage
      pageImage.parent().append(clone);
      //show the clone
      clone.show();
      //hide the pageImage
      pageImage.hide();
      wordImage.hide();
      //set the currentGlyph to the glyph
      Template.instance().currentGlyph.set(id);
  }
}

 
  

//function to initialize cropper
function initCropper(type) {
  //replace the image with a canvas that has the same dimensions and source
  if (type == 'page') {
    divId = document.getElementById('pageImage');
  }
  if (type == 'line') {
    divId = document.getElementById('lineImage');
    
  }
  if (type == 'word') {
    divId = document.getElementById('wordImage');
  }
  if (type == 'phoneme') {
    divId = document.getElementById('phonemeImage');
  }
  //get calculated width and height of the div
  height = window.getComputedStyle(divId).height;
  width = window.getComputedStyle(divId).width;
  
  src = divId.src;
  
  x = false;
  y = false;
  deswidth = false;
  desheight = false;
  //hide the original image with display none
  divId.style.display = 'none';
  const image = new Image();
  image.src = src;
  const canvas = document.createElement('canvas');
  // Set the height on the canvas style
  canvas.style.height = height;
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0);


  xScaling = image.width / divId.width;
  yScaling = image.height / divId.height;
  console.log("xScaling is " + xScaling + ". yScaling is " + yScaling);
  Template.instance().yScaling.set(image.height / divId.height);
  Template.instance().xScaling.set(image.width / divId.width);

  //set the width and height of the canvas to the width and height of the div
  canvas.style.width = divId.style.width;
  canvas.style.height = divId.style.height / yScaling;

  //add absolute positioning to the canvas at 0,0
  canvas.style.position = 'absolute';
  canvas.style.left = '0';
  canvas.style.top = '0';

  //center the canvas vertically
  canvas.style.marginTop = (parseInt(height) - parseInt(canvas.style.height)) / 2 + 'px';

  //set the id to the same id as the div
  canvas.id = divId.id;
  //set the canvas style to the same style as the div
  divId.parentNode.appendChild(canvas);
  divId.style.display = 'none';
  return canvas;
  
}



//function to draw a button at a particular location x,y,width,height on canvas with a data-type and data-index.
// We use relative positioning to draw the button over the canvas since the user can zoom in and out of the canvas
function drawButton(image, x, y, width, height, type, text, id) {

  //round the x, y, width, and height to the nearest integer
  x = Math.round(x);
  y = Math.round(y);
  width = Math.round(width);
  height = Math.round(height);

  //get the canvas' context
  const context = image.getContext('2d');


  //create button element
  const button = document.createElement('button');
  button.setAttribute('data-id', id);
  button.setAttribute('data-type', type);


  //get the canvas' container
  const parent = context.canvas.parentNode;

  //get the canvas' computed offset relative to the parent
  const canvasOffset = context.canvas.getBoundingClientRect();

  //get the canvas' data-url
  const src = context.canvas.toDataURL('image/png');

  //create a new image
  const img = new Image();
  img.src = src;

  //calculate the scale factor
  const xScaling =  canvasOffset.width / context.canvas.width;

  
  let defaultClass = 'selectElement';
  
  //draw the button at the x, y, width, and height 
  button.style.position = 'absolute';
  button.style.left = (x * xScaling) + 'px';
  button.style.top = (y * xScaling) + 'px';
  button.style.width = (width * xScaling) + 'px';
  button.style.height = (height * xScaling) + 'px';

  //add a label on the bottom left corner of the button that says the type and index
  const label = document.createElement('label');
  label.textContent = type + ' ' + text;
  label.style.position = 'absolute';
  label.style.bottom = '0';
  label.style.left = '0';

  //label width is only 10 percent of the width of the button
  label.style.width = '10%';
  label.style.height = '15px';

  //label font size is 10px
  label.style.fontSize = '10px';


  //if type is line, set transparent light green background and child label to be light green non-transparent and a green border
  if (type == 'line') {
    button.style.backgroundColor = 'rgba(0, 255, 0, 0.2)';
    button.style.border = '1px solid green';
    label.style.backgroundColor = 'green';
    label.style.color = 'white';
  }

  if (type == 'word') {
    button.style.backgroundColor = 'rgba(0, 0, 255, 0.2)';
    button.style.border = '1px solid blue';
    label.style.backgroundColor = 'blue';
    label.style.color = 'white';
  }

  if (type == 'phoneme') {
    button.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
    button.style.border = '1px solid red';
    label.style.backgroundColor = 'red';
    label.style.color = 'white';
    defaultClass = 'showReferences';
  }

  if (type == 'glyph') {
    button.style.backgroundColor = 'rgba(255, 255, 0, 0.2)';
    button.style.border = '1px solid yellow';
    label.style.backgroundColor = 'yellow';
    label.style.color = 'black';
    defaultClass = 'showReferences';
    
    // Debug each glyph button as it's created
    console.log(`Creating glyph button: ID=${id}, X=${x}, Width=${width}, Class=${defaultClass}`);
  }


  //set the button class to 'select-element'
  button.className = defaultClass;
  
  button.appendChild(label);


  //append the button to the parent
  parent.appendChild(button);
  
  // Add a click event listener directly to the button for debugging
  if (type === 'glyph') {
    button.addEventListener('click', function(e) {
      console.log(`Direct glyph button click detected: ID=${id}`);
      debugGlyphButton(this, 'direct click listener');
    });
  }
  
}

//function to draw a button at a particular location x,y,width,height on canvas with a data-type and data-index.
// We use relative positioning to draw the button over the canvas since the user can zoom in and out of the canvas
function drawRect(image, x, y, width, height, type, text, id) {

  //get the canvas' context
  const context = image.getContext('2d');

  


  //draw a rectangle at the x, y, width, and height
  //if type is line, set transparent light green background and child label to be light green non-transparent and a green border
  if (type == 'line') {
    context.fillStyle = 'rgba(0, 255, 0, 0.2)';
    context.strokeStyle = 'green';
    context.lineWidth = 1;
  }
  if (type == 'word') {
    context.fillStyle = 'rgba(0, 0, 255, 0.2)';
    context.strokeStyle = 'blue';
    context.lineWidth = 1;
  }
  context.fillRect(x, y, width, height);
  
}



//replace the image with a canvas that has the same dimensions and source
function replaceWithOriginalImage() {
  //remove the cropper from the DOM
  cropper = Template.instance().cropper.get();
  if (cropper) {
    cropper.destroy();
    $('.cropper-container').remove();
    
  }
  //unhide the original image
  $('#pageImage').show();
  $('#pageImage').parent().children('canvas').remove();
}

function debugGlyphButton(element, eventType) {
  const type = element.getAttribute('data-type');
  const id = element.getAttribute('data-id');
  if (type === 'glyph') {
    console.group('Glyph Button Debug - ' + eventType);
    console.log('Event type:', eventType);
    console.log('Button type:', type);
    console.log('Button ID:', id);
    console.log('Element:', element);
    console.log('CSS classes:', element.className);
    console.log('Position:', {
      left: element.style.left,
      top: element.style.top,
      width: element.style.width,
      height: element.style.height
    });
    console.groupEnd();
  }
}

Template.viewPage.helpers({
  currentDocument() {
    const instance = Template.instance();
    documentId = instance.currentDocument.get();
    console.log("currentDocument is " + documentId);
    if (documentId) {
      doc = Documents.findOne({_id: documentId});
      //for each pages, get the images from the files collection
      console.log(doc);
      doc.pages.forEach(function(page) {
        page.image = Files.findOne({_id: page.pageId}).link();
      });
      return doc;

    } else {
        //open the openModal modal if no document is selected
        $('#openModal').modal('show');
    }
  },
  selectedDocument() {
    const instance = Template.instance();
    return function(newDocument) {
      instance.currentDocument.set(newDocument);
    }
  },
  selectedPage() {
    const instance = Template.instance();
    return function(newPage) {
      instance.currentPage.set(newPage);
      page = Documents.findOne({_id: instance.currentDocument.get()}).pages[newPage];
      console.log(page);
      //reset the pageImage to the new page's image
      $('#pageImage').attr('src', page.image);
      
    }
  },
  currentPage() {
    const instance = Template.instance();
    currentPage = instance.currentPage.get();
    console.log("currentPage is " + currentPage);
    if (currentPage) {
      page = Documents.findOne({_id: instance.currentDocument.get()}).pages[currentPage];
      console.log(page);
      return page;
    } else {
      return false;
    }
  },
  currentPageNumber() {
    const instance = Template.instance();
    currentPage = instance.currentPage.get();
    console.log("currentPage is " + currentPage);
    if (currentPage) {
      return currentPage;
    } else {
      return 1;
    }
  },
  
  currentLine() {
    const instance = Template.instance();
    return instance.currentLine.get();
  },
  totalPages() {
    const instance = Template.instance();
    documentId = instance.currentDocument.get();
    console.log("currentDocument is " + documentId);
    if (documentId) {
      doc = Documents.findOne({_id: documentId});
      //for each pages, get the images from the files collection
      console.log("doc.pages.length is " + doc.pages.length);
      console.log(doc);
      return doc.pages.length;

    } else {
      return false;
    }
  },
  toolOptions() {
    const instance = Template.instance();
    const tool = instance.currentTool.get();
    return tool;
  },
  toolOptionsData() {
    const instance = Template.instance();
    return tool = instance.currentTool;
  },
  currentTool() {
    const instance = Template.instance();
    return instance.currentTool.get();
  },
  currentToolHumanReadable() {
    const instance = Template.instance();
    tool = instance.currentTool.get();
    if (tool == 'view') {
      return 'View';
    } else if (tool == 'select') {
      return 'Select';
    } else if (tool == 'searchGlyphs') {
      return 'Search Glyphs';
    } else if (tool == 'createReference') {
      return 'Create Reference';
    } else if (tool == 'createLine') {
      return 'Create Line';
    } else if (tool == 'createWord') {
      return 'Create Word';
    } else if (tool == 'createPhoneme') {
      return 'Create Phoneme';
    } else if (tool == 'newGlyph') {
      return 'Create Glyph';
    } else {tool == 'selectReference'
      return 'Select Reference';
    }
  },
  curretSubTool() {
    const instance = Template.instance();
    return instance.subTool.get();
  },
  currentHelp() {
    const instance = Template.instance();
    return instance.currentHelp.get();
  },
  currentView() {
    const instance = Template.instance();
    return instance.currentView.get();
  },  
  discussions() {
    const instance = Template.instance();
    return instance.discussions.get();
  },
  currentDiscussion() {
    const instance = Template.instance();
    return instance.currentDiscussion.get();
  },
  totalPages() {
    const currentDocument = Template.instance().currentDocument.get();
    return currentDocument && currentDocument.pages ? currentDocument.pages.length : 0;
  },
});

Template.viewPage.events({
  'mouseover #ToolBox'(event, instance) {
    console.log("mouseover");
    //make sure the opacity is 1
    $('#ToolBox').fadeTo(100, 1);
    //set the background color to bootstrap's light color
    $('#ToolBox').css('background-color', '#f8f9fa');
  },
  'mouseleave #ToolBox'(event, instance) {
    console.log("mouseout");
    //fade out the toolbox
    $('#ToolBox').fadeTo(100, 0.8);
    //set background color to transparent
    $('#ToolBox').css('background-color', 'transparent');
  },
  'mouseover #HelpBox'(event, instance) {
    //opacity on mouseover if the currentTool is 'createLine', 'createWord', or 'createPhoneme'
    $('#HelpBox').fadeTo(100, 1);
  },
  'mouseleave #HelpBox'(event, instance) {
    //opacity on mouseleave if the currentTool is 'createLine', 'createWord', or 'createPhoneme'
    $('#HelpBox').fadeTo(100, 0.2);    
  },

  'click #exitTool'(event, instance) {
    //set the currentTool to view
    instance.currentTool.set('view');
    hideAllToolButtons();
    resetToolbox();
    $('.cropper-container').remove();
    $('#pageImage').removeClass('cropper-hidden');
    //delete all buttons from the pageImage's parent
    $('#pageImage').parent().children('button').remove();
    setCurrentHelp(false);
    if (instance.currentView.get() != 'line') {
      replaceWithOriginalImage();
    } else {
      $('#originalImage').show();
      //change the originalImage id to pageImage
      $('#originalImage').attr('id', 'pageImage');
      //delete the cropper container
      $('.cropper-container').remove();
      //delete any canvas with the class 'cropper-hidden'
      $('canvas.cropper-hidden').remove();
      //switch the pageImage to the originalImage
      $('#lineImage').show();
      
    }
  },
  'click #lastPage'(event, instance) {
    event.preventDefault();
    const currentPage = instance.currentPage.get();
    if (currentPage > 0) {
      instance.currentPage.set(currentPage - 1);
    }
  },
  'click #nextPage'(event, instance) {
    event.preventDefault();
    const currentPage = instance.currentPage.get();
    const totalPages = instance.totalPages.get();
    if (currentPage < totalPages) {
      instance.currentPage.set(currentPage + 1);
    }
  },
  'click .changePage'(event, instance) {
    event.preventDefault();
    //get data-id attribute from the button using pure javascript
    const page = event.currentTarget.getAttribute('data-id');
    console.log("changePage to " + 
    page);
    instance.currentPage.set(page);
  },
  'dblclick .page-title': function(event, template) {
    const target = $(event.currentTarget);
    target.find('.title-text').hide();
    target.find('.title-input').show().focus();
  },
  'blur .title-input': function(event, template) {
    const target = $(event.currentTarget);
    const newTitle = target.val();
    const pageIndex = target.closest('.page-title').data('id');
    const documentId = template.currentDocument.get();
    doc = Documents.findOne({_id: documentId});
    doc.pages[pageIndex].title = newTitle;

    // Call the server method to update the page title
    Meteor.call('modifyDocument', doc);
    target.hide();
    target.siblings('.title-text').text(newTitle).show();
  },
  'click #viewTool'(event, instance) {
    event.preventDefault();
    resetToolbox();
    //set the currentTool to btn-dark
    $('#viewTool').removeClass('btn-light').addClass('btn-dark');
    instance.currentTool.set('view');
  },

  'click #selectItem'(event, instance) {
  event.preventDefault();
  instance.currentTool.set('select');
  resetToolbox();
  //set the currentTool to btn-dark
  $('#selectItem').removeClass('btn-light').addClass('btn-dark');
  selectedLine = instance.currentLine.get();
  selectedWord = instance.currentWord.get();
  selectedGlyph = instance.currentGlyph.get();
  currentView = instance.currentView.get();
  console.log("selectedLine is " + selectedLine);
  if (currentView == 'simple') {
    image = initCropper("page");
    const context = image.getContext('2d');
    const page = instance.currentPage.get();
    const documentId = instance.currentDocument.get();
    const lines = Documents.findOne({_id: documentId}).pages[page].lines;
    //if there are no lines, simulate clicking the exitTool button
    if (lines.length == 0) {
      alert("No lines to display. Use the Create Line tool to create a line.");
      $('#exitTool').click();
      return;
    }
    //sort the lines by y1
    lines.sort(function(a, b) {
      return a.y1 - b.y1;
    });
    //split the canvas into multiple canvases by line
    lines.forEach(function(line) {
      index = lines.indexOf(line);
      drawButton(image, 0, line.y1, image.width, line.height, 'line', index, index);
    });
    //hide the original image with display none
    setCurrentHelp('To select a line, click on the line.  To cancel, click the close tool button.');
  }
  if(currentView == 'line') {
    //get $('#lineImage') and change it from img-fluid to a calculated width and height
    calcWidth = $('#lineImage').width();
    calcHeight = $('#lineImage').height();
    $('#lineImage').removeClass('img-fluid');
    //add width and height to the lineImage's style
    $('#lineImage').css('width', calcWidth + 'px');
    $('#lineImage').css('height', calcHeight + 'px');
    image = initCropper("line");
    const context = image.getContext('2d');
    const page = instance.currentPage.get();
    const documentId = instance.currentDocument.get();
    const words = Documents.findOne({_id: documentId}).pages[page].lines[selectedLine].words;
    //if there are no words, simulate clicking the exitTool button
    if (words.length == 0) {
      alert("No words to display. Use the Create Word tool to create a word.");
      $('#exitTool').click();
      return;
    }
    //sort the words by x1
    words.sort(function(a, b) {
      return a.x - b.x;
    });
    //split the canvas into multiple canvases by word
    words.forEach(function(word) {
      index = words.indexOf(word);
      drawButton(image, word.x, 0, word.width, image.height, 'word', index, index);
    });
    //hide the original image with display none
    setCurrentHelp('To select a word, click on the word.  To cancel, click the close tool button.');
  }
  if(currentView == 'word') {
    //get $('#wordImage') and change it from img-fluid to a calculated width and height
    calcWidth = $('#wordImage').width();
    calcHeight = $('#wordImage').height();
    $('#wordImage').removeClass('img-fluid');
    //add width and height to the wordImage's style
    $('#wordImage').css('width', calcWidth + 'px');
    $('#wordImage').css('height', calcHeight + 'px');
    image = initCropper("word");
    const context = image.getContext('2d');
    const page = instance.currentPage.get();
    const documentId = instance.currentDocument.get();
    const doc = Documents.findOne({_id: documentId});
    const lineId = instance.currentLine.get();
    const wordId = instance.currentWord.get();
    const word = doc.pages[page].lines[lineId].words[wordId];
    const phonemes = word.phonemes || [];
    const glyphs = word.glyphs || word.glyph || []; // Handle both possible property names
    
    console.log("Found phonemes:", phonemes.length);
    console.log("Found glyphs:", glyphs.length);
    
    // Check if there are no elements to display
    if (phonemes.length === 0 && glyphs.length === 0) {
      alert("No phonemes or glyphs to display. Use the Create Phoneme or Create Glyph tool to create a phoneme or glyph.");
      $('#exitTool').click();
      return;
    }
    
    //sort the phonemes by x
    if (phonemes.length > 0) {
      phonemes.sort(function(a, b) {
        return a.x - b.x;
      });
      //split the canvas into multiple canvases by phoneme
      phonemes.forEach(function(phoneme) {
        index = phonemes.indexOf(phoneme);
        drawButton(image, phoneme.x, 0, phoneme.width, image.height, 'phoneme', index, index);
      });
    }
    
    //sort the glyphs by x
    if (glyphs.length > 0) {
      glyphs.sort(function(a, b) {
        return a.x - b.x;
      });
      console.log(`Found ${glyphs.length} glyphs to display in word view`);
      
      //split the canvas into multiple canvases by glyph
      glyphs.forEach(function(glyph) {
        index = glyphs.indexOf(glyph);
        console.log("Drawing glyph button at:", glyph.x, 0, glyph.width, image.height);
        drawButton(image, glyph.x, 0, glyph.width, image.height, 'glyph', index, index);
      });
      
      // After creating all the glyph buttons, add a debug message
      setTimeout(() => {
        const glyphButtons = document.querySelectorAll('button[data-type="glyph"]');
        console.log(`Glyph buttons created: ${glyphButtons.length}`);
        glyphButtons.forEach(btn => {
          console.log(`Glyph button: ID=${btn.getAttribute('data-id')}, Classes=${btn.className}`);
        });
      }, 100);
    }
    
    //hide the original image with display none
    setCurrentHelp('To select a phoneme or glyph, click on the phoneme or glyph. To cancel, click the close tool button.');
  }
  if(currentView == 'glyph') {
    // Similar to word view but for elements within a glyph if needed
    $('#exitTool').click(); // No additional elements within a glyph for now
  }
},

  'click .selectElement'(event, instance) {
    event.preventDefault();
    const target = event.currentTarget;
    const type = target.getAttribute('data-type');
    const id = target.getAttribute('data-id');
    
    // Debug logging specifically for glyphs
    if (type === 'glyph') {
      console.group('Glyph Selection Debug');
      console.log('Glyph button clicked (selectElement handler):', 
        'ID:', id,
        'Element:', target);
      console.log('Event target:', event.target);
      console.log('Event currentTarget:', event.currentTarget);
      console.groupEnd();
    }
    
    console.log("selectElement, type is " + type + " and id is " + id);
    
    // Call the shared function
    handleElementSelection(type, id, instance);
  },
  
  'click .showReferences'(event, instance) {
    event.preventDefault();
    const target = event.currentTarget;
    debugGlyphButton(target, 'showReferences click');
    
    // Check if this is a glyph button
    const type = target.getAttribute('data-type');
    if (type === 'glyph') {
      console.log('Glyph button clicked (showReferences class):', 
        'ID:', target.getAttribute('data-id'),
        'Element:', target);
      
      // Get the id
      const id = target.getAttribute('data-id');
      
      // Call the same element selection logic used by selectElement
      handleElementSelection(type, id, instance);
    }
  },
  
  'click .open-tab'(event, instance) {
    event.preventDefault();
    //get the clicked tab data-tab-id
    tabId = event.target.getAttribute('data-tab-id');
    //set the aria of the parent to true
    $(event.target).attr('aria-selected', 'true');
    //set the class of the parent to active
    $(event.target).addClass('active');
    if(tabId == 'flow') {
      //hide the image-container
      $('#image-container').hide();
      instance.currentView.set('flow');
      instance.currentTool.set('view');
      resetToolbox();
      //hide the image-container class
      $('.image-container').hide();
      //show the flow-container by removing display none
      $('.flow-container').show();
      //generate the drawflow
      generateFlow();
    } else {
      //show the image-container
      $('#image-container').hide();
    }
    if(tabId == 'line') {
      instance.currentView.set('line');
      instance.currentTool.set('view');
      resetToolbox();
      //get the currentLine
      currentLine = instance.currentLine.get();
      setImage('line', currentLine);
    }
    if(tabId == 'word') {
      instance.currentView.set('word');
      instance.currentTool.set('view');
      resetToolbox();
      //get the currentLine
      currentLine = instance.currentLine.get();
      //get the currentWord
      currentWord = instance.currentWord.get();
      setImage('word', currentWord);
    }
    if(tabId == 'glyph') {
      instance.currentView.set('glyph');
      instance.currentTool.set('view');
      resetToolbox();
      //get the currentLine
      currentLine = instance.currentLine.get();
      //get the currentWord
      currentWord = instance.currentWord.get();
      //get the currentGlyph
      currentGlyph = instance.currentGlyph.get();
      setImage('glyph', currentGlyph);
    }
    if(tabId == 'simple'){
      instance.currentView.set('simple');
      instance.currentTool.set('view');
      resetToolbox();
      replaceWithOriginalImage();
    }


  },
  'click .close-tab' (event, instance) {
    event.preventDefault();
    //get the grandparent of the event target
    grandparent = event.target.parentElement.parentElement;
    //get the data-parent of the grandparent
    tabparent = grandparent.getAttribute('data-parent');
    //get the data-type of the grandparent
    type = grandparent.getAttribute('data-type');


    if (type == 'line') {
      instance.currentLine.set(false);
      $('#lineImage').remove();
    }
    if (type == 'word') {
      instance.currentWord.set(false);
      $('#wordImage').remove();
    }
    if (type == 'phoneme') {
      instance.currentPhoneme.set(false);
      $('#phonemeImage').remove();
    }
    if (type == 'glyph') {
      instance.currentGlyph.set(false);
      $('#glyphImage').remove();
    }

    
    //if the tab exists, make it active
    if (tabparent != 'simple') {
      //set the currentView to the tabparent's type
      instance.currentView.set(tabparent.split('-')[3]);
      console.log("currentView is " + instance.currentView.get());
      //simulate a click on the tabparent's button
      $('#' + tabparent + ' button').click();
    } else {
      //set the currentView to simple
      instance.currentView.set('simple');
      //simulate a click on the simple tab
      $('#simple-tab').click();
    }
    //remove the grandparent
    grandparent.remove();
    resetToolbox();
  },
  'click #searchGlyphs'(event, instance) {
    event.preventDefault();
    resetToolbox();
    //set the currentTool to btn-dark
    $('#searchGlyphs').removeClass('btn-light').addClass('btn-dark');
    setCurrentHelp(false);
    instance.currentTool.set('searchGlyphs');
  },
  'click #createReference'(event, instance) {
    event.preventDefault();
    resetToolbox();
    //set the currentTool to btn-dark
    $('#createReference').removeClass('btn-light').addClass('btn-dark');
    instance.currentTool.set('createReference');
  },
  'click #confirmTool'(event, instance) {
    currentTool = instance.currentTool.get();
    if(currentTool == 'createLine') {
      ret = Meteor.callAsync('addLineToPage', instance.currentDocument.get(), instance.currentPage.get(), instance.selectx1.get(), instance.selecty1.get(), instance.selectwidth.get(), instance.selectheight.get());
      alert("line added");
      //find the cropper and destroy it
      $('.cropper-container').remove();
      $('#pageImage').removeClass('cropper-hidden');
    } else if(currentTool == 'createWord') {
      //document, page, line, x, width, wordOrder=false, word=false
      ret = Meteor.callAsync('addWordToLine', instance.currentDocument.get(), instance.currentPage.get(), instance.currentLine.get(), instance.selectx1.get(), instance.selectwidth.get());
      alert("word added");
      //find the cropper and destroy it
      $('.cropper-container').remove();
      $('#pageImage').removeClass('cropper-hidden');
    }  else if(currentTool == 'createPhoneme') {
      //open the modal
      instance.currentTool.set('view');
      resetToolbox();
      $('.cropper-container').remove();
      $('#pageImage').removeClass('cropper-hidden');
      //delete all buttons from the pageImage's parent
      $('#pageImage').parent().children('button').remove();
      setCurrentHelp(false);
      replaceWithOriginalImage();
      $('#createPhonemeModal').modal('show');
    } else if(currentTool == 'createGlyph') {
      //open the modal
      instance.currentTool.set('view');
      resetToolbox();
      $('.cropper-container').remove();
      $('#pageImage').removeClass('cropper-hidden');
      //delete all buttons from the pageImage's parent
      $('#pageImage').parent().children('button').remove();
      setCurrentHelp(false);
      replaceWithOriginalImage();
      $('#createGlyphModal').modal('show');
      //set glyphcanvas to have the cropped image as its background with 
      glyphCanvas = document.getElementById('glyphCanvas');
      glyphCanvas.width = instance.selectwidth.get();
      glyphCanvas.height = instance.selectheight.get();
      glyphContext = glyphCanvas.getContext('2d');
      glyphImage = new Image();
      glyphImage.src = $('#wordImage').attr('src');
      glyphImage.onload = function() {
        glyphContext.drawImage(glyphImage, instance.selectx1.get(), instance.selecty1.get(), instance.selectwidth.get(), instance.selectheight.get(), 0, 0, glyphCanvas.width, glyphCanvas.height);
      }
      //renanme the glyphimage Id to glyphImageActual
      $('#glyphImage').attr('id', 'glyphImageActual');
      //create a new canvas with the id glyphImageDraw
      glyphImageDraw = document.createElement('canvas');
      glyphImageDraw.width = instance.selectwidth.get();
      glyphImageDraw.height = instance.selectheight.get();
      glyphImageDraw.id = 'glyphImageDraw';
      //add a border to the glyphImageDraw
      glyphImageDraw.style.border = '1px solid black';
      //append the glyphImageDraw to the parent of the glyphCanvas
      glyphCanvas.parentNode.appendChild(glyphImageDraw);
      //set the src of the glyphImage to the dataURL of the glyphCanvas
      $('#glyphImage').attr('src', glyphCanvas.toDataURL('image/png'));

    } else if(currentTool == 'createElement') {
      // Similar approach to the other tools - call the server method to add the element
      ret = Meteor.callAsync('addElementToGlyph', 
        instance.currentDocument.get(), 
        instance.currentPage.get(), 
        instance.currentLine.get(),
        instance.currentWord.get(),
        instance.currentGlyph.get(),
        instance.selectx1.get(),
        instance.selecty1.get(),
        instance.selectwidth.get(),
        instance.selectheight.get()
      );
      alert("element added");
      // Clean up the cropper
      $('.cropper-container').remove();
      $('#pageImage').removeClass('cropper-hidden');
    }

  },
  //event listners to draw on the glyphImageDraw canvas
  'mousedown #glyphImageDraw'(event, instance) {
    event.preventDefault();
    //get the x and y of the mouse down event
    x = event.offsetX;
    y = event.offsetY;
    //set the drawing to true
    instance.drawing.set(true);
    //set the x and y of the mouse down event
    instance.x.set(x);
    instance.y.set(y);
  },
  'mousemove #glyphImageDraw'(event, instance) {
    event.preventDefault();
    //if drawing is true, draw a line from the x and y to the current x and y
    if (instance.drawing.get()) {
      x = instance.x.get();
      y = instance.y.get();
      x1 = event.offsetX;
      y1 = event.offsetY;
      //get the canvas and context
      canvas = document.getElementById('glyphImageDraw');
      context = canvas.getContext('2d');
      //set the line width to 10 percent of the canvas width
      context.lineWidth = canvas.width * 0.1;
      //set the stroke style to black
      context.strokeStyle = 'black';
      //begin the path
      context.beginPath();
      //move to the x and y
      context.moveTo(x, y);
      //line to the x1 and y1
      context.lineTo(x1, y1);
      //stroke the path
      context.stroke();
      //set the x and y to the x1 and y1
      instance.x.set(x1);
      instance.y.set(y1);
    }
  },
  'mouseup #glyphImageDraw'(event, instance) {
    event.preventDefault();
    //set drawing to false
    instance.drawing.set(false);
  },
  //modal popup tools
  'click #confirmPhoneme'(event, instance) {
    event.preventDefault();
    let ipa = $('#phonemeInput').val();
    //hide the modal
    $('#createPhonemeModal').modal('hide');
    //create the phoneme (Meteor call  addPhonemeToWord: function(document, page, line, word, x, width, ipa)
    ret = Meteor.callAsync('addPhonemeToWord', instance.currentDocument.get(), instance.currentPage.get(), instance.currentLine.get(), instance.currentWord.get(), instance.selectx1.get(), instance.selectwidth.get(), ipa);
    alert("phoneme added");
  },
  'click #confirmGlyph'(event, instance) {
    event.preventDefault();
    //get the glyphCanvas
    glyphCanvas = document.getElementById('glyphCanvas');
    //get the glyphImageDraw
    glyphImageDraw = document.getElementById('glyphImageDraw');
    //get the glyphImageActual
    //get the image data from the glyphImageDraw and glyphCanvas
    glyphImageData = glyphImageDraw.toDataURL('image/png');
    glyphImageDataActual = glyphCanvas.toDataURL('image/png');
    //submit the glyph addGlyphToWord: function(document, page, line, word, x, width, documentImageData, drawnImageData) {
    ret = Meteor.callAsync('addGlyphToWord', instance.currentDocument.get(), instance.currentPage.get(), instance.currentLine.get(), instance.currentWord.get(), instance.selectx1.get(), instance.selectwidth.get(), glyphImageDataActual, glyphImageData);
    alert("glyph added");
    //close the modal and destroy the glyphImageDraw
    $('#createGlyphModal').modal('hide');
    $('#glyphImageDraw').remove();
  },
  'click #createLine'(event, instance) {
    event.preventDefault();
    console.log("createLine, drawing is " + instance.drawing.get());
    //disable all buttons in the toolbox-container
    //set the currentTool to btn-dark
    $('#createLine').removeClass('btn-light').addClass('btn-dark');
    instance.currentTool.set('createLine');
    resetToolbox();
    image = initCropper('page');
    //draw all bounding boxes from the page
    const context = image.getContext('2d');
    const page = instance.currentPage.get();
    const documentId = instance.currentDocument.get();
    const lines = Documents.findOne({_id: documentId}).pages[page].lines;
    //sort the lines by y1
    lines.sort(function(a, b) {
      return a.y1 - b.y1;
    });
    lines.forEach(function(line) {
      console.log("drawing line");
      index = lines.indexOf(line);
      drawRect(image, 0, line.y1, image.width, line.height, 'line', index, index);
    });
    setCurrentHelp('To create a bounding box to represent a line in the document, use the cropping bounds to select the area of the page that contains the line. Hit Enter to confirm the selection.  To cancel, click the close tool button.');
    //se the image css to display block and max-width 100%
    image.style.display = 'block';
    image.style.maxWidth = '100%';   
    //create a cropper object for the pageImage
    cropDetails = {};
    //add a event listener for hitting the enter key, which will confirm the selection
    const cropper = new Cropper(image, {
      //initial x position is 0, y is the last line's y2, width is the image's width, height is 20px
      dragMode: 'crop',
      aspectRatio: 0,
      crop(event) {
        cropDetails = event.detail;
        instance.selectx1.set(cropDetails.x);
        instance.selecty1.set(cropDetails.y);
        instance.selectwidth.set(cropDetails.width);
        instance.selectheight.set(cropDetails.height);
      }
    });
    cropper.setCropBoxData({left: 0, top: lines[lines.length - 1].y2, width: image.width, height: 20});

  },
  'click #createWord'(event, instance) {
    event.preventDefault();
    console.log("createWord, drawing is " + instance.drawing.get());
    //disable all buttons in the toolbox-container
    //set the currentTool to btn-dark
    $('#createWord').removeClass('btn-light').addClass('btn-dark');
    instance.currentTool.set('createWord');
    resetToolbox();
    image = initCropper('line');
    //draw all bounding boxes from the line
    const context = image.getContext('2d');
    const page = instance.currentPage.get();
    const documentId = instance.currentDocument.get();
    const doc = Documents.findOne({_id: documentId});
    const lineId = instance.currentLine.get();
    const line = doc.pages[page].lines[lineId];
    const words = line.words;
    //sort the words by x1
    words.sort(function(a, b) {
      return a.x - b.x;
    });
    words.forEach(function(word) {
      console.log("drawing word");
      index = words.indexOf(word);
      drawRect(image, word.x, 0, word.width, image.height, 'word', index, index);
    });
    setCurrentHelp('To create a bounding box to represent a word in the document, use the cropping bounds to select the area of the page that contains the word. Hit Enter to confirm the selection.  To cancel, click the close tool button.');
    //se the image css to display block and max-width 100%
    image.style.display = 'block';
    image.style.maxWidth = '100%';
    //create a cropper object for the pageImage
    cropDetails = {};
    //add a event listener for hitting the enter key, which will confirm the selection
    const cropper = new Cropper(image, {
      //initial x position is 0, y is the last line's y2, width is the image's width, height is 20px
      dragMode: 'crop',
      aspectRatio: 0,
      crop(event) {
        cropDetails = event.detail;
        instance.selectx1.set(cropDetails.x);
        instance.selecty1.set(cropDetails.y);
        instance.selectwidth.set(cropDetails.width);
        instance.selectheight.set(cropDetails.height);
      }
    });
    cropper.setCropBoxData({left: 0, top: 0, width: image.width, height: image.height});
  },
  'click #createPhoneme'(event, instance) {
    event.preventDefault();
    console.log("createPhoneme, drawing is " + instance.drawing.get());
    //disable all buttons in the toolbox-container
    //set the currentTool to btn-dark
    $('#createPhoneme').removeClass('btn-light').addClass('btn-dark');
    instance.currentTool.set('createPhoneme');
    resetToolbox();
    //show confirmTool button
    $('#confirmTool').show();
    //show cancelTool button
    $('#cancelTool').show();
    image = initCropper('word');
    //draw all bounding boxes from the word
    const context = image.getContext('2d');
    const page = instance.currentPage.get();
    const documentId = instance.currentDocument.get();
    const doc = Documents.findOne({_id: documentId});
    const lineId = instance.currentLine.get();
    const wordId = instance.currentWord.get();
    const word = doc.pages[page].lines[lineId].words[wordId];
    const phonemes = word.phonemes || [];
    //sort the phonemes by x1
    phonemes.sort(function(a, b) {
      return a.x - b.x;
    });
    phonemes.forEach(function(phoneme) {
      console.log("drawing phoneme");
      index = phonemes.indexOf(phoneme);
      drawRect(image, phoneme.x, 0, phoneme.width, image.height, 'phoneme', index, index);
    });
    setCurrentHelp('To create a bounding box to represent a phoneme in the document, use the cropping bounds to select the area of the page that contains the phoneme. Hit Enter to confirm the selection.  To cancel, click the close tool button.');
    //se the image css to display block and max-width 100%
    image.style.display = 'block';
    image.style.maxWidth = '100%';
    //create a cropper object for the pageImage
    cropDetails = {};
    //add a event listener for hitting the enter key, which will confirm the selection
    const cropper = new Cropper(image, {
      //initial x position is 0, y is the last line's y2, width is the image's width, height is 20px
      dragMode: 'crop',
      aspectRatio: 0,
      crop(event) {
        cropDetails = event.detail;
        instance.selectx1.set(cropDetails.x);
        instance.selecty1.set(cropDetails.y);
        instance.selectwidth.set(cropDetails.width);
        instance.selectheight.set(cropDetails.height);
      }
    });
    cropper.setCropBoxData({left: 0, top: 0, width: image.width, height: image.height});
  },
  'click #createGlyph'(event, instance) {
    event.preventDefault();
    console.log("createGlyph, drawing is " + instance.drawing.get());
    //disable all buttons in the toolbox-container
    //set the currentTool to btn-dark
    $('#createGlyph').removeClass('btn-light').addClass('btn-dark');
    instance.currentTool.set('createGlyph');
    resetToolbox();
    image = initCropper('word');
    //draw all bounding boxes from the word
    const context = image.getContext('2d');
    const page = instance.currentPage.get();
    const documentId = instance.currentDocument.get();
    const doc = Documents.findOne({_id: documentId});
    const lineId = instance.currentLine.get();
    const wordId = instance.currentWord.get();
    const word = doc.pages[page].lines[lineId].words[wordId];
    const glyphs = word.glyph;
    //sort the phonemes by x1
    glyphs.sort(function(a, b) {
      return a.x - b.x;
    });
    glyphs.forEach(function(glyph) {
      console.log("drawing glyph");
      index = glyphs.indexOf(glyph);
      drawRect(image, glyph.x, 0, glyph.width, image.height, 'glyph', index, index);
    });
    setCurrentHelp('To create a bounding box to represent a glyph in the document, use the cropping bounds to select the area of the page that contains the glyph. Hit Enter to confirm the selection.  To cancel, click the close tool button.');
    //se the image css to display block and max-width 100%
    image.style.display = 'block';
    image.style.maxWidth = '100%';
    //create a cropper object for the pageImage
    cropDetails = {};
    //add a event listener for hitting the enter key, which will confirm the selection
    const cropper = new Cropper(image, {
      //initial x position is 0, y is the last line's y2, width is the image's width, height is 20px
      dragMode: 'crop',
      aspectRatio: 0,
      crop(event) {
        cropDetails = event.detail;
        instance.selectx1.set(cropDetails.x);
        instance.selecty1.set(cropDetails.y);
        instance.selectwidth.set(cropDetails.width);
        instance.selectheight.set(cropDetails.height);
      }
    });
    cropper.setCropBoxData({left: 0, top: 0, width: image.width, height: image.height});
  },

  'click #createElement'(event, instance) {
    event.preventDefault();
    console.log("createElement, drawing is " + instance.drawing.get());
    // Set the currentTool to btn-dark
    $('#createElement').removeClass('btn-light').addClass('btn-dark');
    instance.currentTool.set('createElement');
    resetToolbox();
    
    // Initialize cropper for the glyph image
    image = initCropper('glyph');
    
    // Draw all existing elements from the glyph
    const context = image.getContext('2d');
    const page = instance.currentPage.get();
    const documentId = instance.currentDocument.get();
    const doc = Documents.findOne({_id: documentId});
    const lineId = instance.currentLine.get();
    const wordId = instance.currentWord.get();
    const glyphId = instance.currentGlyph.get();
    
    // Get the glyph from the document
    const line = doc.pages[page].lines[lineId];
    const word = line.words[wordId];
    const glyphsArray = word.glyphs || word.glyph || [];
    const glyph = glyphsArray[glyphId];
    
    // Check if glyph has elements
    const elements = glyph.elements || [];
    
    // If there are existing elements, draw them on the canvas
    if (elements.length > 0) {
      // Sort the elements by position
      elements.sort(function(a, b) {
        return a.x - b.x;
      });
      
      // Draw existing elements as rectangles
      elements.forEach(function(element) {
        console.log("drawing element");
        index = elements.indexOf(element);
        drawRect(image, element.x, element.y, element.width, element.height, 'element', index, index);
      });
    }
    
    setCurrentHelp('To create a bounding box to represent an element in the glyph, use the cropping bounds to select the area that contains the element. Click Confirm when done or Exit to cancel.');
    
    // Set the image css to display block and max-width 100%
    image.style.display = 'block';
    image.style.maxWidth = '100%';
    
    // Create a cropper object for the glyphImage
    cropDetails = {};
    const cropper = new Cropper(image, {
      dragMode: 'crop',
      aspectRatio: 0,
      crop(event) {
        cropDetails = event.detail;
        instance.selectx1.set(cropDetails.x);
        instance.selecty1.set(cropDetails.y);
        instance.selectwidth.set(cropDetails.width);
        instance.selectheight.set(cropDetails.height);
      }
    });
    
    // Store the cropper instance to destroy it later
    instance.cropper.set(cropper);
    
    // Set initial crop box to a reasonable size
    cropper.setCropBoxData({left: 10, top: 10, width: image.width/4, height: image.height/4});
  },

  //keyboard shift and mouse wheel event
  'wheel #pageImage'(event, instance) {
    if(event.shiftKey) {

      console.log(event);
      //get the current calculated height of the image
      height = window.getComputedStyle(document.getElementById('pageImage')).getPropertyValue('height');
      width = window.getComputedStyle(document.getElementById('pageImage')).getPropertyValue('width');
      //if the mouse wheel is scrolled up, increase the height by 10%
      if (event.originalEvent.deltaY < 0) {
        document.getElementById('pageImage').style.height = parseInt(height) * 1.1 + 'px';
        document.getElementById('pageImage').style.width = parseInt(width) * 1.1 + 'px';
      } else {
        //if the mouse wheel is scrolled down, decrease the height by 10%
        document.getElementById('pageImage').style.height = parseInt(height) * 0.9 + 'px';
        document.getElementById('pageImage').style.width = parseInt(width) * 0.9 + 'px';
      }


      
    }
  },
  //logout and head to the home page
  'click #allExit': function(event, instance) {
      Router.go('/logout');
  },
  //click addPage to open the addPageModal
  'click #addPage': function(event, instance) {
    event.preventDefault();
    //if theres a data-id, we set the currentPage to the data-id
    if(event.target.getAttribute('data-id')) {
      instance.currentPage.set(event.target.getAttribute('data-id'));
    }
    $('#createPageModal').modal('show');
  },
  'submit #createPageForm'(event, template) {
    event.preventDefault();
    console.log("submitNewPage");

    // Disable the submit button
    $('#submitNewPage').prop('disabled', true);

    // Get the title and file from the form
    const title = $('#pageTitle').val();
    const file = $('#newpageImage').get(0).files[0];
    const documentId = template.currentDocument.get();
    const pageIndex = $('#pageIndex').val();
    console.log("Filename: " + file.name + ". Title: " + title + ".", "DocumentId: " + documentId + ". PageIndex: " + pageIndex + ".");

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
          const thispage = {
            title: title,
            addedBy: Meteor.userId(),
            lines: []


          };
          doc = Documents.findOne({_id: documentId});
          doc.pages.push(thispage);
          //           addPageToDocument: function(document, fileObjId, pageNumber, title){
          Meteor.call('addPageToDocument', documentId, fileObj._id, pageIndex, title, function(error, result) {
            if (error) {
              console.log(error);
              alert('Error adding page');
            } else {
              console.log(result);
              alert('Page added');
              // Enable the submit button
              $('#submitNewPage').prop('disabled', false);
              $('#createPageModal').modal('hide');
            }
          });
        }
      });
      upload.start();
    }
  },
'click .move-up'(event, instance) {
    event.preventDefault();
    const pageIndex = parseInt(event.currentTarget.getAttribute('data-id'));
    const documentId = instance.currentDocument.get();
    if (pageIndex > 0) {
      Meteor.call('movePage', documentId, pageIndex, pageIndex - 1, (error, result) => {
        if (error) {
          console.error('Error moving page up:', error);
        } else {
          console.log('Page moved up successfully');
        }
      });
    }
  },

  'click .move-down'(event, instance) {
    event.preventDefault();
    const pageIndex = parseInt(event.currentTarget.getAttribute('data-id'));
    const documentId = instance.currentDocument.get();
    const totalPages = Documents.findOne({_id: documentId}).pages.length;
    if (pageIndex < totalPages - 1) {
        Meteor.call('movePage', documentId, pageIndex, pageIndex + 1, (error, result) => {
            if (error) {
                console.error('Error moving page down:', error);
            } else {
                console.log('Page moved down successfully');
            }
        });
    }
  },
  'click #createElement'(event, instance) {
    event.preventDefault();
    resetToolbox();
    $('#createElement').removeClass('btn-light').addClass('btn-dark');
    instance.currentTool.set('createElement');

    const pageIndex = instance.currentPage.get();
    const documentId = instance.currentDocument.get();
    const lineIndex = instance.currentLine.get();
    const wordIndex = instance.currentWord.get();
    const phonemeIndex = instance.currentPhoneme.get();
    const glyphIndex = instance.currentGlyph.get();
    
    // Only run the cropper initialization if we're in glyph view
    if (instance.currentView.get() === 'glyph') {
      // Initialize cropper for the glyph image
      const glyphCanvas = initCropper('glyph');
      
      setCurrentHelp('Use the cropping tool to select an area in the glyph that represents a specific element. Click Confirm when done or Exit to cancel.');
      
      // Create a cropper object for the glyphImage
      cropDetails = {};
      const cropper = new Cropper(glyphCanvas, {
        dragMode: 'crop',
        aspectRatio: 0,
        crop(event) {
          cropDetails = event.detail;
          instance.selectx1.set(cropDetails.x);
          instance.selecty1.set(cropDetails.y);
          instance.selectwidth.set(cropDetails.width);
          instance.selectheight.set(cropDetails.height);
        }
      });
      
      // Store the cropper instance to destroy it later
      instance.cropper.set(cropper);
    }
  },
  
  // ...existing code...
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
    //disable the submit button
    $('#submitDocument').prop('disabled', true);
    //get the author, title, and file from the form
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
              alert('Document added');
              //enable the submit button
              $('#submitDocument').prop('disabled', false);
              //click the #view-tab button
              $('#view-tab').click();
            }
          });
        }
      });
      upload.start();
    }
  }
});

//Template for uploading fonts
Template.uploadFont.onCreated(function() {
  this.currentUpload = new ReactiveVar(false);
});

//Template helpers for uploading fonts
Template.uploadFont.helpers({
  currentUpload() {
    return Template.instance().currentUpload.get();
  }
});


//Template for new blank document
Template.newDocument.events({
  'click #submitNewDocument' (event, instance) {
    event.preventDefault();
    //takes id author and title and calls addBlankDocument method
    title = $('#newTitle').val();
    author = $('#newAuthor').val();
    Meteor.call('addBlankDocument', title, author, function(error, result) {
      if (error) {
        console.log(error);
        alert('Error adding document');
      } else {
        console.log(result);
        alert('Document added');
      }
    });
  }
});


//Template events for uploading fonts
Template.uploadFont.events({
  'click #submitFont'(event, template) {
    console.log("submitFont");
    event.preventDefault();
    const font = $('#font').get(0).files[0];
    console.log("Filename: " + font.name);
    if (font) {
      const upload = Files.insert({
        file: font,
        chunkSize: 'dynamic'
      }, false);

      upload.on('end', function(error, fileObj) {
        if (error) {
          console.log(error);
          alert('Error uploading file');
        } else {
          console.log(fileObj);
          Meteor.call('addFont', fileObj._id, function(error, result) {
            if (error) {
              console.log(error);
              alert('Error adding font');
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

//Template events for select options
Template.select.events({
  'click #selectReference'(event, instance) {
    Template.instance().data.set('selectReference');
  },
  'click #selectLine'(event, instance) {
    Template.instance().data.set('selectLine');
  },
  'click #selectWord'(event, instance) {
    Template.instance().data.set('selectWord');
  },
  'click #selectGlyph'(event, instance) {
    Template.instance().data.set('selectGlyph');
  }

});

function isContainedBy(point, x1, y1, x2, y2) {
  return point.x > x1 && point.x < x2 && point.y > y1 && point.y < y2;
}


function setCurrentHelp(help) {
  const instance = Template.instance();
  instance.currentHelp.set(help);
}

// Create a shared function that both handlers can use
function handleElementSelection(type, id, instance) {
  console.log("Processing element selection, type is " + type + " and id is " + id);
  
  //simulate clicking the exitTool button
  $('#exitTool').click();
  
  //copy view-tab-template to it's parent
  viewTemplate = $('#view-tab-template');
  clone = viewTemplate.clone(); 
  //append the clone to the parent
  viewTemplate.parent().append(clone);
  //set the id of the clone to view-tab-element-<type>-<id>
  clone.attr('id', 'view-tab-element-' + type + '-' + id);
  //set the data-type and data-id of the clone to the type and id
  clone.attr('data-type', type);
  clone.attr('data-id', id);
  //get the parent element type using cases
  let parent, parenttab;
  if (type == 'line') {
    parent = 'simple';
    parenttab = 'simple';
  }
  if (type == 'word') {
    parentId = instance.currentLine.get();
    parenttab = "view-tab-element-line-" + parentId;
  }
  if (type == 'glyph') {
    parentId = instance.currentWord.get();
    lineId = instance.currentLine.get();
    parenttab = "view-tab-element-word-" + parentId;
  }

  //set the data-parent of the clone to the parent's expected tab id
  clone.attr('data-parent', parenttab);
  clone.attr('id', 'view-tab-element-' + type + '-' + id);

  //get the amount of tabs open
  tabs = $('#view-tab-template').parent().children().length;
  //set the clone's data tab index to the number of tabs open
  clone.attr('data-tab-index', tabs);
  $(clone).children().attr('data-tab-id', type);
  //show the clone
  clone.show();
  //make all parent's siblings buttons inactive
  $('#view-tab-template').parent().children().children().removeClass('active');
  //change all button's aria-selected to false
  $('#view-tab-template').parent().children().children().attr('aria-selected', 'false');
  //change the clone's button aria-selected to true
  clone.children().attr('aria-selected', 'true');
  clone.children().addClass('active');
  //prepend <type> uppercase and id to the clone's button text
  clone.children().prepend(type.charAt(0).toUpperCase() + type.slice(1) + ' ' + id + ' ');
  //set the current view to the type
  instance.currentView.set(type);
  resetToolbox();
  setImage(type, id);
}
