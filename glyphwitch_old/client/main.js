import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FilesCollection } from 'meteor/ostrio:files';
import { Session } from 'meteor/session';
import Cropper from 'cropperjs';



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



//Template for displaying Stats
Template.registerHelper('stats', function() {
  //return a string of the counts of the documents, references, phonemes, fonts, glyphs, and discussions
  return "GlyphWitch Stats: " + Documents.find().count() + " documents, " + References.find().count() + " references, " + Phonemes.find().count() + " phonemes, " + Fonts.find().count() + " fonts, " + Glyphs.find().count() + " glyphs, " + Discussions.find().count() + " discussions.";
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
    //call the createUser method
    Meteor.call('createUser', email, password, function(error, result) {
      if (error) {
        console.log(error);
        alert('Error signing up');
      } else {
        console.log(result);
        //login the user
        Meteor.loginWithPassword(email, password, function(error, result) {
          if (error) {
            console.log(error);
            alert('Error logging in');
          } else {
            console.log(result);
            //redirect to the dashboard
            Router.go('/viewPage');
          }
        });
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
    $(button.hide);
    //exclude the exitTool and confirmTool
    if ($(button).attr('id') != 'exitTool' && $(button).attr('id') != 'confirmTool') {
      $(button).removeClass('btn-dark').addClass('btn-light');
    }
  });
  //if currentTool is not false, enable the exitTool
  if (currentView == 'simple') {
    if(currentTool == 'view') {
      $('#viewTool').removeClass('btn-light').addClass('btn-dark');
      //show the viewTool, createReference, createLine, searchGlyphs, and selectTool
      $('#viewTool').show();
      $('#createReference').show();
      $('#createLine').show();
      $('#searchGlyphs').show();
    }
    if(currentTool == 'createLine') {
      hideAllToolButtoms();
      $('#exitTool').show();
      $('#confirmTool').show();
    }
    if(currentTool == 'select') {
      hideAllToolButtoms();
      $('selectTool').removeClass('btn-light').addClass('btn-dark');
      $('#exitTool').show();
    }
   } else if (currentView == 'line') {
    if(currentTool == 'view') {
      hideAllToolButtoms();
      //show the viewTool, createWord,  selectTool, and viewTool
      $('#viewTool').show();
      $('#createWord').show();
      $('#selectTool').show();

      $('#viewTool').removeClass('btn-light').addClass('btn-dark');
    } 
    if(currentTool == 'select') {
      $('selectTool').removeClass('btn-light').addClass('btn-dark');
      $('#exitTool').show();
    }
    if(currentTool == 'createWord') {
      $('#createWord').removeClass('btn-light').addClass('btn-dark');
      $('#exitTool').show();
      $('#confirmTool').show();
    }
    if(currentTool == 'createPhoneme') {
      $('#createPhoneme').removeClass('btn-light').addClass('btn-dark');
      $('#exitTool').show();
      $('#confirmTool').show();
    }
  } else if(currentView == 'word') {
      //show the createPhoneme, createGlyph, and selectTool, and viewTool
      $('#viewTool').show();
      $('#createPhoneme').show();
      $('#createGlyph').show();
      $('#selectTool').show();
      if(currentTool == 'view') {
        $('.toolbox-container button').removeClass('btn-dark').addClass('btn-light').show();
        //hide create line, create word, 
    } 
  } 
}

//fucntion to generate document flow
function generateFlow() {
  //import gojs library




}

function hideAllToolButtoms() {
  $(buttons).each(function(index, button) {
    $(button.hide);
    //exclude the exitTool and confirmTool
    if ($(button).attr('id') != 'exitTool' && $(button).attr('id') != 'confirmTool') {
      $(button).removeClass('btn-dark').addClass('btn-light');
    }
  });
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


  //set the button class to 'select-element'
  button.className = 'selectElement';
  
  button.appendChild(label);


  //append the button to the parent
  parent.appendChild(button);
  
  
  
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
      return false;
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
      return false;
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
  }
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
        return;
      }
      //sort the lines by y1
      lines.sort(function(a, b) {
        return a.y1 - b.y1;
      }
      );
      //split the canvas into multiple canvases by line
      lines.forEach(function(line) {
        index = lines.indexOf(line);
        drawButton(image, 0, line.y1, image.width, line.height, 'line', index, index);
      }
      );
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
        return;
      }
      //sort the words by x1
      words.sort(function(a, b) {
        return a.x1 - b.x1;
      }
      );
      //split the canvas into multiple canvases by word
      words.forEach(function(word) {
        index = words.indexOf(word);
        drawButton(image, word.x, 0, word.width, image.height, 'word', index, index);
      }
      );
      //hide the original image with display none
      setCurrentHelp('To select a word, click on the word.  To cancel, click the close tool button.');
    }
  },
  'click .selectElement'(event, instance) {
    event.preventDefault();
    //simulate clicking the exitTool button
    $('#exitTool').click();
    //get the data-type and data-id from the button
    const type = event.target.getAttribute('data-type');
    const id = event.target.getAttribute('data-id');
    console.log("selectElement, type is " + type + " and id is " + id);
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
    //get the ammount of tabs open
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
    //prepent <type> uppercase and id to the clone's button text
    clone.children().prepend(type.charAt(0).toUpperCase() + type.slice(1) + ' ' + id + ' ');
    //set the current view to the type
    instance.currentView.set(type);
    resetToolbox();
    setImage(type, id);
  
  },
  'click #open-tab'(event, instance) {
    event.preventDefault();
    //get the clicked tab data-tab-id
    tabId = event.target.getAttribute('data-tab-id');
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
    if(tabId == 'simple'){
      instance.currentView.set('simple');
      instance.currentTool.set('view');
      resetToolbox();
      replaceWithOriginalImage();
    }


  },
  'click .close-tab' (event, instance) {
    event.preventDefault();
    //get the parent's parent of the button
    parent = event.target.parentNode;
    grandparent = event.target.parentNode.parentNode;
    greatgrandparent = grandparent.parentNode;
    //get the data-tab-index from the parent
    index = grandparent.getAttribute('data-tab-index');
    //get the data-type from the parent
    type = grandparent.getAttribute('data-type');
    //if line, set the currentLine to false
    if (type == 'line') {
      instance.currentLine.set(false);
      $('#lineImage').remove();
    }

    //get the tab with the same data-tab-index - 1
    searchIndex = parseInt(index) - 1;
    //remove the tab
    parent.parentNode.remove();
    tab = $(greatgrandparent).children('[data-tab-index=' + searchIndex + ']');
    //if the tab exists, make it active
    if (tab.length > 0) {
      tab[0].children().addClass('active');
      tab[0].children().attr('aria-selected', 'true');
    } else {
      //activate the first tab
      first = $(greatgrandparent).children().first();
      first.children().addClass('active');
      first.children().attr('aria-selected', 'true');
      //set the currentView to simple
      instance.currentView.set('simple');
      //set currentTool to view
      instance.currentTool.set('view');
      //replace the image with the original image
      replaceWithOriginalImage();
    }
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
    }
    instance.currentTool.set('view');
    resetToolbox();
    $('.cropper-container').remove();
    $('#pageImage').removeClass('cropper-hidden');
    //delete all buttons from the pageImage's parent
    $('#pageImage').parent().children('button').remove();
    setCurrentHelp(false);
    replaceWithOriginalImage();
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
