import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FilesCollection } from 'meteor/ostrio:files';
import { Session } from 'meteor/session';
import  Cropper  from 'cropperjs';


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
          Router.go('dashboard');
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
});

Template.selectDocument.helpers({
  documents() {
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
    const instance = Template.instance();
    instance.currentDocument.set(event.target.value);

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
  currentPage = Router.current().params.page;
  currentDocument = Router.current().params.documentId;
  Template.instance().currentLine = new ReactiveVar(false);
  //set the global variables

  console.log("currentDocument is " + currentDocument);
  console.log("currentPage is " + currentPage);
  Template.instance().currentDocument = new ReactiveVar(currentDocument);
  Template.instance().currentPage = new ReactiveVar(currentPage);
  Template.instance().currentTool =  new ReactiveVar('view');
  Template.instance().subTool = new ReactiveVar(false);
  Template.instance().currentHelp = new ReactiveVar("You can use [Shift] + Scroll to zoom in and out of the page image.");
  Template.instance().drawing = new ReactiveVar(false);
  Template.instance().bound1 = new ReactiveVar(false);
  Template.instance().bound2 = new ReactiveVar(false);
  Template.instance().originalImage = new ReactiveVar(false);
  Template.instance().yScaling = new ReactiveVar(1);
  Template.instance().xScaling = new ReactiveVar(1);

});



//function to reset all buttons in toolbox-container to btn-light
function resetToolbox() {
  currentTool = Template.instance().currentTool.get();
  //if the createLine button is disabled, we need to reload the entire page
  $('.toolbox-container button').removeClass('btn-dark').addClass('btn-light').hide();
  $('#exitTool').hide();
  //if currentTool is not false, enable the exitTool
  if (currentTool) {
    console.log("currentTool is " + currentTool);
    $('#exitTool').show();
    //set exittool to have class btn-danger
    $('#exitTool').removeClass('btn-light').addClass('btn-danger');
  }
  
}

//function to initialize cropper
function initCropper(divId, x=false, y=false, deswidth=false, desheight=false) {
  //replace the image with a canvas that has the same dimensions and source
  if(!divId.src) {
   src = Template.instance().originalImage.get();
  } else {
    Template.instance().originalImage.set(divId.src);
    src = divId.src;
  }
  const image = new Image();
  image.src = src;
  const canvas = document.createElement('canvas');
  // Get the declared height (consider using getComputedStyle for more flexibility)
  height = window.getComputedStyle(divId).getPropertyValue('height');




  //if x, y, deswidth, and desheight are set, crop the image
  if (x && y && deswidth && desheight) {
      // crop the image
      canvas.style.height = desheight;
      canvas.width = deswidth;
      canvas.height = desheight;
      const context = canvas.getContext('2d');
      //create a new image with the cropped dimensions
      context.drawImage(image, x, y, deswidth, desheight, 0, 0, deswidth, desheight);
      //set the source of the image to the cropped image
      image.src = canvas.toDataURL('image/png');
      ogWidth = window.getComputedStyle(divId).getPropertyValue('width');
      ogHeight = window.getComputedStyle(divId).getPropertyValue('height');
      //get the scale difference between the original image and the cropped image
      scaleX = deswidth / ogWidth;
      scaleY = desheight / ogHeight;
      //set the width of the element to the original width
      divId.style.width = ogWidth;
      //set the height of the element to the original height scaled by the difference between the original height and the cropped height
      divId.style.height = ogHeight * scaleY;
      //set the divId to the cropped image
      divId.src = image.src;
      //display the cropped image
      divId.style.display = 'block';
      //set the width and height of the image to the computed width and height
      console.log("image width is " + image.width + ". image height is " + image.height);
      height = window.getComputedStyle(divId).getPropertyValue('height');
      
      






      
  } else {
      // Set the height on the canvas style
      canvas.style.height = height;
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0);
  }



  xScaling = image.width / divId.width;
  yScaling = image.height / divId.height;
  console.log("xScaling is " + xScaling + ". yScaling is " + yScaling);
  Template.instance().yScaling.set(image.height / divId.height);
  Template.instance().xScaling.set(image.width / divId.width);

  //set the width and height of the canvas to the width and height of the div
  canvas.style.width = divId.style.width;
  canvas.style.height = divId.style.height / yScaling;

  //center the canvas vertically
  canvas.style.marginTop = (parseInt(height) - parseInt(canvas.style.height)) / 2 + 'px';

  //set the id to the same id as the div
  canvas.id = divId.id;
  //set the canvas style to the same style as the div
  divId.id = "originalImage"
  divId.parentNode.appendChild(canvas);
  divId.style.display = 'none';
  return canvas;
  
}

//function to draw a rectangle on the canvas given x1, y1, width, and height
function drawRectangle(context, x1, y1, width, height) {
  context.beginPath();
  context.rect(x1, y1, width, height);
  context.stroke();
}

//function to draw a button over a img element relative to the parent div element given x1, y1, width, and height
function drawButton(image, x1, y1, width, height, type, text, id) {
  console.log("drawing button over " + image + " at " + x1 + ", " + y1 + " with width " + width + " and height " + height);
  //create a new button element
  const button = document.createElement('button');
  //set the data-id attribute to the id
  button.setAttribute('data-id', id);
  //set the data-type attribute to the type
  button.setAttribute('data-type', type);
  //set the text of the button to the text
  button.textContent = text;
  //get the image's computed dimensions
  const imageWidth = window.getComputedStyle(image).getPropertyValue('width');
  const imageHeight = window.getComputedStyle(image).getPropertyValue('height');
  const imageX = window.getComputedStyle(image).getPropertyValue('left');
  const imageY = window.getComputedStyle(image).getPropertyValue('top');
  //get the scale difference between the image and the parent div
  const xScaling = image.width / parseInt(imageWidth);
  const yScaling = image.height / parseInt(imageHeight);
  //set the button's position to absolute
  button.style.position = 'relative';
  

  console.log("appended button: " + button + " to " + image.parentNode);
}





//reset the canvas to the original image
function resetCropper() {
  //redraw the original image
  const image = new Image();
  image.src = Template.instance().originalImage.get();
  //get the #pageImage canvas
  const canvas = document.getElementById('pageImage');
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0);
}

//replace the image with a canvas that has the same dimensions and source
function replaceWithOriginalImage() {
  //delete the canvas
  const canvas = document.getElementById('pageImage');
  canvas.parentNode.removeChild(canvas);
  //get the original image
  const image = document.getElementById('originalImage');
  image.id = 'pageImage';
  image.style.display = 'block';
  //reset the cropper's variables
  Template.instance().drawing.set(false);
  Template.instance().bound1.set(false);
  Template.instance().bound2.set(false);
  Template.instance().yScaling.set(1);
  Template.instance().xScaling.set(1);
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
    $('#ToolBox').fadeTo(100, 0.2);
    //set background color to transparent
    $('#ToolBox').css('background-color', 'transparent');
  },
  'click #exitTool'(event, instance) {
    //reload the page
    location.reload();
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
    resetToolbox();
    //set the currentTool to btn-dark
    $('#selectItem').removeClass('btn-light').addClass('btn-dark');
    instance.currentTool.set('select');
    setCurrentHelp(false);
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
  'click #createLine'(event, instance) {
    event.preventDefault();
    resetToolbox();
    console.log("createLine, drawing is " + instance.drawing.get());
    //disable all buttons in the toolbox-container
    //set the currentTool to btn-dark
    $('#createLine').removeClass('btn-light').addClass('btn-dark');
    instance.currentTool.set('createLine');
    cropper = initCropper(document.getElementById('pageImage'));
    //draw all bounding boxes from the page
    const context = cropper.getContext('2d');
    const page = instance.currentPage.get();
    const documentId = instance.currentDocument.get();
    const lines = Documents.findOne({_id: documentId}).pages[page].lines;
    lines.forEach(function(line) {
      console.log("drawing line");
      index = lines.indexOf(line);
      drawRectangle(context, line.x1, line.y1, line.width, line.height);
    });
    setCurrentHelp('To create a bounding box to represent a line in the document, click once at the top left corner of the bounding box, then click again at the bottom right corner of the bounding box.  The bounding box will be drawn on the page image.  To confirm the bounding box, click the confirm button.  To cancel the bounding box, click the close tool button.');
    //set the subTool to createWord
    console.log(cropper);
    //bring the cropper to the front

  },
  'click #createWord'(event, instance) {
    event.preventDefault();
    instance.currentTool.set('createWord');
    instance.subTool.set("selectLine");
    resetToolbox();
    //set the currentTool to btn-dark
    $('#createWord').removeClass('btn-light').addClass('btn-dark');
    //disable all buttons in the toolbox-container
    //initialize the cropper
    cropper = initCropper(document.getElementById('pageImage'));
    originalImage = document.getElementById('originalImage');
    console.log("originalImage is " + originalImage.src);
    //draw all bounding boxes from the page's lines
    const context = cropper.getContext('2d');
    const page = instance.currentPage.get();
    const documentId = instance.currentDocument.get();
    const lines = Documents.findOne({_id: documentId}).pages[page].lines;
    lines.forEach(function(line) {
      drawRectangle(context, line.x1, line.y1, line.width, line.height);
    });
    setCurrentHelp('To create a word boundary, select the line that the word is contained in.  Click inside the line to select it. To cancel, click the close tool button.');
  },
  'click #createPhoneme'(event, instance) {
    event.preventDefault();
    resetToolbox();
    //set the currentTool to btn-dark
    $('#createPhoneme').removeClass('btn-light').addClass('btn-dark');
    instance.currentTool.set('createPhoneme');
  },
  'click #createGlyph'(event, instance) {
    event.preventDefault();
    resetToolbox();
    //set the currentTool to btn-dark
    $('#createGlyph').removeClass('btn-light').addClass('btn-dark');
    setCurrentHelp(false);
    instance.currentTool.set('newGlyph');
  },
  'click #selectItem': function(event, instance) {
    console.log("selectItem");
    resetToolbox();
    //set the currentTool to select
    $('#selectItem').removeClass('btn-light').addClass('btn-dark');
    instance.currentTool.set('select');
    setCurrentHelp(false);

  },
  //mouse events
  'mousedown #pageImage'(event, instance) {
    console.log("mousedown");

    const tool = instance.currentTool.get();
    const subTool = instance.subTool.get();
    const drawing = instance.drawing.get();
    if (tool == 'createLine' && drawing == false && subTool == false) {

      if (instance.bound1.get() && instance.drawing.get() == false) {
        replaceWithOriginalImage();
        cropper = initCropper(document.getElementById('pageImage'));
        //draw all bounding boxes from the page
        const context = cropper.getContext('2d');
        const page = instance.currentPage.get();
        const documentId = instance.currentDocument.get();
        const lines = Documents.findOne({_id: documentId}).pages[page].lines;
        lines.forEach(function(line) {
          drawRectangle(context, line.x1, line.y1, line.width, line.height);
        });

        return;
      } else {
        
      instance.drawing.set(true);
      //set pointer events for ToolOptions to none and hide the ToolOptions
      $('#ToolOptions').css('pointer-events', 'none');
      $('#ToolOptions').hide();
    


      //get the current mouse position and set the first bound to that position.  Use the scaling factors to adjust the position
      const xScaling = instance.xScaling.get();
      const yScaling = instance.yScaling.get();

      instance.bound1.set({x: event.offsetX * xScaling, y: event.offsetY * yScaling}) 
      console.log("bound1 is " + JSON.stringify(instance.bound1.get()) + ". Drawing is " + instance.drawing.get());
      }
    } else if (tool == 'createLine' && drawing == true) {
      instance.drawing.set(false);
      //set the ToolOptions to have pointer events and show the ToolOptions
      $('#ToolOptions').css('pointer-events', 'auto');
      $('#ToolOptions').show();
      //get the current mouse position and set the second bound to that position.  Use the scaling factors to adjust the position
      const xScaling = instance.xScaling.get();
      const yScaling = instance.yScaling.get();
      instance.bound2.set({x: event.offsetX * xScaling, y: event.offsetY * yScaling}) 
      console.log("bound2 is " + JSON.stringify(instance.bound2.get()) + ". Drawing is " + instance.drawing.get());
      //display createLineModal
      $('#createLineModal').modal('show');
    } else if (tool == 'createWord' && subTool == 'selectLine') {
      console.log("selectLine for createWord");
      //get the mouse position on the canvas
      mousePositionX = event.offsetX;
      mousePositionY = event.offsetY;
      //scale the mouse position by the scaling factors
      const xScaling = instance.xScaling.get();
      const yScaling = instance.yScaling.get();
      mousePositionX = mousePositionX * xScaling;
      mousePositionY = mousePositionY * yScaling;
      console.log("mousePositionX is " + mousePositionX + ". mousePositionY is " + mousePositionY);
      lines = Documents.findOne({_id: instance.currentDocument.get()}).pages[instance.currentPage.get()].lines;
      index = 0;
      lines.forEach(function(line) {
        index = lines.indexOf(line);
        console.log("checking line " + JSON.stringify(line), isContainedBy({x: mousePositionX, y: mousePositionY}, line.x1, line.y1, line.x1 + line.width, line.y1 + line.height));
        if (isContainedBy({x: mousePositionX, y: mousePositionY}, line.x1, line.y1, line.x1 + line.width, line.y1 + line.height)) {
          console.log("setting currentLine to " + JSON.stringify(line) + " at index " + index);
          instance.currentLine.set(index);
          //get the context of the canvas
          canvas = document.getElementById('pageImage');
          context = canvas.getContext('2d');
          //draw the bounding box of the line and existing word bounding boxes
          drawRectangle(context, line.x1, line.y1, line.width, line.height);
          words = line.words;
                  
          words.forEach(function(word) {
            //we extrapolate the word's bounding box from the line's height, the words's x1, and width
            console.log("drawing word x1: " + word.x1 + " y1: " + line.y1 + " width: " + word.width + " height: " + line.height);
            drawRectangle(context, word.x, line.y1, word.width, line.height);
          });
          setCurrentHelp('Now that a line has been selected, create a boundary for the word by clicking once at the top left corner of the bounding box, then clicking again at the bottom right corner of the bounding box.  The bounding box will be drawn on the page image.  To confirm the bounding box, click the confirm button.  To cancel the bounding box, click the close tool button.');
          //set subtool to createWord
          instance.subTool.set('createWord');       
          instance.drawing.set(false); 
        }
        index++;
      });
    } else if (tool == 'createWord' && subTool == 'createWord' && drawing == false) {
      //get the current scaling factors
      const xScaling = instance.xScaling.get();
      const yScaling = instance.yScaling.get();
      //get the mouse position on the canvas
      instance.bound1.set({x: event.offsetX * xScaling, y: event.offsetY * yScaling});
      //set drawing to true
      instance.drawing.set(true);
    } else if (tool == 'createWord' && subTool == 'createWord' && drawing == true) {
      //get the current scaling factors
      const xScaling = instance.xScaling.get();
      const yScaling = instance.yScaling.get();
      //get the mouse position on the canvas
      instance.bound2.set({x: event.offsetX * xScaling, y: event.offsetY * yScaling});
      //set drawing to false
      instance.drawing.set(false);
      instance.subTool.set(false);
      instance.currentHelp.set(false);
      //display createWordModal
      $('#createWordModal').modal('show');
    }

  },
  //if mouse moves while drawing, draw a bounding box from the first point to the current point
  'mousemove #pageImage'(event, instance) {
    if (instance.drawing.get()) {
      //redraw the original image (optional)
      resetCropper();
      const context = event.target.getContext('2d');
      context.strokeStyle = 'black';
      const bound1 = instance.bound1.get();
      

      
      // Calculate width and height based on current position, use scaling factors to adjust the position
      const xScaling = instance.xScaling.get();
      const yScaling = instance.yScaling.get();
      const width = event.offsetX * xScaling - bound1.x;
      const height = event.offsetY * yScaling - bound1.y;
      
      context.beginPath();
      context.rect(bound1.x, bound1.y, width, height);
      context.stroke(); 
      console.log("drawing rectangle from " + JSON.stringify(bound1) + " with width " + width + " and height " + height)
    }
  },
  'click #confirmLine'(event, instance) {
    //we call meteor method addLineToPage: function(document, page_number, x1, y1, width, height)
    const documentId = instance.currentDocument.get();
    const page = instance.currentPage.get();
    const bound1 = instance.bound1.get();
    const bound2 = instance.bound2.get();
    const x1 = bound1.x;
    const y1 = bound1.y;
    const width = bound2.x - bound1.x;
    const height = bound2.y - bound1.y;
    console.log("addLineToPage with " + documentId + ", " + page + ", " + x1 + ", " + y1 + ", " + width + ", " + height);
    Meteor.call('addLineToPage', documentId, page, x1, y1, width, height, function(error, result) {
      if (error) {
        console.log(error);
        alert('Error adding line to page');
      } else {
        console.log(result);
        $('#createLineModal').modal('hide');
      }
    });
    location.reload();
  },
  'click #confirmWord'(event, instance) {
    //we call meteor method addWordToLine: function(document, page_number, line_number, x1, y1, width, height)
    const documentId = instance.currentDocument.get();
    const page = instance.currentPage.get();
    const line = instance.currentLine.get();
    instance.currentLine.set(false);
    const bound1 = instance.bound1.get();
    const bound2 = instance.bound2.get();
    instance.bound1.set(false);
    instance.bound2.set(false);
    const x1 = bound1.x;
    const y1 = bound1.y;
    const width = bound2.x - bound1.x;
    const height = bound2.y - bound1.y;
    console.log("addWordToLine with " + documentId + ", " + page + ", " + line + ", " + x1 + ", " + y1 + ", " + width + ", " + height);
    Meteor.call('addWordToLine', documentId, page, line, x1, width, function(error, result) {
      if (error) {
        console.log(error);
        alert('Error adding word to line');
      } else {
        console.log(result);
        $('#createWordModal').modal('hide');
      }
    });
    //set the location to reload the page with the current page and document
    routeTo = "/viewPage/" + instance.currentDocument.get() + "/" + instance.currentPage.get();
    location.reload();
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
