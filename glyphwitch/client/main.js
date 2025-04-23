import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { FilesCollection } from 'meteor/ostrio:files';
import { Session } from 'meteor/session';
import Cropper from 'cropperjs';
import go from 'gojs';
import './views/versionInfo.js';
import { initDocumentTree, addTreeButtonHandlers, ScriptLoader } from './jstree-sidebar.js';

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
  
  // Add a short delay to ensure user authentication is complete
  Meteor.setTimeout(() => {
    // If the user is logged in, automatically open the Start modal
    if (Meteor.userId()) {
      Meteor.setTimeout(() => {
        $('#openModal').modal('show');
      }, 500); // Short delay to ensure the modal is ready
    }
  }, 300);
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

//Template Helper to display current year
Template.registerHelper('currentYear', function() {
  //return the current year
  return new Date().getFullYear();
});

// Helper to add numbers - used for incrementing page numbers in display
Template.registerHelper('add', function(a, b) {
  return Number(a) + Number(b);
});

// Custom Handlebars helper to track indexes for nested loops
Handlebars.registerHelper('setIndex', function(value) {
  this.index = Number(value);
  return '';
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
    const context = $('#glyphImageDraw')[0].getContext('2d');
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
    // Make sure we're setting to zero as a number, not a string
    fn2(0);
  },
  'change #selectDoc'(event, instance) {
    const newDoc = event.target.value;
    const setDocumentFn = instance.setDocument.get();
    setDocumentFn(newDoc);
    const setPageFn = instance.setPage.get();
    // Make sure we're setting to zero as a number, not a string
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

  const instance = this;
  // Set up an autorun to refresh the tree when document changes
  this.autorun(() => {
    const documentId = instance.currentDocument.get();
    if (documentId) {
      console.log("Document changed, refreshing tree:", documentId);
      Meteor.setTimeout(() => {
        if ($.jstree && $.jstree.reference('#documentTree')) {
          initDocumentTree(documentId);
        }
      }, 300);
    }
  });
  
  // Add autorun for reactive data refresh - watches for document data changes
  this.autorun(() => {
    const documentId = instance.currentDocument.get();
    if (documentId) {
      // Reactive data fetch that will re-run when document data changes
      const docData = Documents.findOne({_id: documentId});
      
      // Only refresh if we have an initialized tree and actual document data
      if (docData && $.jstree && $.jstree.reference('#documentTree')) {
        console.log("Document data changed, refreshing tree");
        initDocumentTree(documentId);
      }
    }
  });
});

//Onrendered function for viewPage
Template.viewPage.onRendered(function() {
  const instance = this;
  
  console.log("viewPage template rendered");
  
  // Initialize sidebar resize functionality
  initSidebarResize();
  
  // Add a more robust initialization sequence for the tree
  const initTreeWithRetry = async (documentId, maxRetries = 3) => {
    let retries = 0;
    
    const attemptInit = async () => {
      console.log(`Attempting to initialize jsTree (attempt ${retries+1} of ${maxRetries})`);
      
      // Mark the container as loading
      $('#documentTree').addClass('jstree-loading').html(`
        <div class="text-center p-3">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="mt-2">Loading Data Browser...</p>
          <small class="text-muted">(Attempt ${retries+1} of ${maxRetries})</small>
        </div>
      `);
      
      // First check if jsTree libraries are available
      if (!ScriptLoader.isJsTreeLoaded()) {
        console.log("jsTree not loaded, attempting to load scripts");
        try {
          await ScriptLoader.ensureJsTree();
          console.log("jsTree successfully loaded");
        } catch (error) {
          console.error("Failed to load jsTree libraries:", error);
          $('#documentTree').removeClass('jstree-loading').html(`
            <div class="alert alert-danger m-2">
              <strong>Library Error:</strong> Could not load jsTree. 
              <button class="btn btn-sm btn-warning mt-2" id="retryScripts">Retry</button>
            </div>
          `);
          
          $('#retryScripts').on('click', function() {
            if (retries < maxRetries) {
              retries++;
              attemptInit();
            } else {
              $('#documentTree').html(`
                <div class="alert alert-danger m-2">
                  <strong>Failed after ${maxRetries} attempts.</strong>
                  <p>Please reload the page or check your network connection.</p>
                </div>
              `);
            }
          });
          
          return;
        }
      }
      
      // Check for document data
      const doc = Documents.findOne({ _id: documentId });
      if (!doc) {
        console.error("Document not found for jsTree:", documentId);
        $('#documentTree').removeClass('jstree-loading').html('<div class="alert alert-warning m-2">Document not found</div>');
        return;
      }
      
      // Initialize jsTree
      try {
        await initDocumentTree(documentId);
        addTreeButtonHandlers();
        console.log("Tree initialized successfully");
      } catch (error) {
        console.error("Error during jsTree initialization:", error);
        $('#documentTree').removeClass('jstree-loading').html(`
          <div class="alert alert-danger m-2">
            <strong>Initialization Error:</strong> ${error.message}
            <button class="btn btn-sm btn-warning mt-2" id="retryTree">Retry</button>
          </div>
        `);
        
        $('#retryTree').on('click', function() {
          if (retries < maxRetries) {
            retries++;
            attemptInit();
          } else {
            $('#documentTree').html(`
              <div class="alert alert-danger m-2">
                <strong>Failed after ${maxRetries} attempts.</strong>
                <p>Try opening the document again.</p>
              </div>
            `);
          }
        });
      }
    };
    
    // Start initialization attempt
    await attemptInit();
  };
  
  // Add a reactive handler for document changes
  instance.autorun(() => {
    const documentId = instance.currentDocument.get();
    if (documentId) {
      console.log("Document changed, initializing tree with document:", documentId);
      
      // Clear any existing content and show loading indicator
      $('#documentTree').addClass('jstree-loading').html(`
        <div class="text-center p-3">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="mt-2">Loading Data Browser...</p>
        </div>
      `);
      
      // Initialize tree with retry mechanism - use a shorter delay
      Meteor.setTimeout(() => {
        initTreeWithRetry(documentId);
      }, 300);
    } else {
      // No document selected
      $('#documentTree').removeClass('jstree-loading').html(`
        <div class="alert alert-info m-2">
          <i class="bi bi-info-circle me-2"></i>
          Select a document to view its structure
        </div>
      `);
    }
  });
  
  // Clear the pageTitle field whenever the modal is closed
  $('#createPageModal').on('hidden.bs.modal', () => {
    $('#pageTitle').val('');
    $('#newpageImage').val('');
  });

  // Add debugging for the collapsible elements
  $(document).on('click', '.file-tree [data-bs-toggle="collapse"]', function(e) {
    const targetId = $(this).attr('href');
    const ariaControls = $(this).attr('aria-controls');
    
    console.group('Collapse Debug');
    console.log('Clicked element:', this);
    console.log('Target ID:', targetId);
    console.log('Aria controls:', ariaControls);
    console.log('Target element exists:', $(targetId).length > 0);
    
    // Log all elements with the same aria-controls
    const sameAriaControls = $(`.file-tree [aria-controls="${ariaControls}"]`);
    console.log('Elements with same aria-controls:', sameAriaControls.length);
    sameAriaControls.each(function(i, el) {
      console.log(`Element ${i}:`, el, 'href:', $(el).attr('href'));
    });
    
    // Log all collapse elements with the same ID
    const sameId = $(targetId);
    console.log('Elements with same ID:', sameId.length);
    console.groupEnd();
  });

  // Add a delay to ensure the DOM is fully rendered
  setTimeout(debugCollapsibleElements, 1000);
});

// Add this to the viewPage events to ensure cleanup
Template.viewPage.events({
  // ...existing code...
  
  // Cleanup sidebar resize event handlers when the template is destroyed
  'template.viewPage.destroyed'() {
    $(document).off('mousemove.sidebarResize');
    $(document).off('mouseup.sidebarResize');
  },
  
  'click #expandAll'(event, instance) {
    event.preventDefault();
    console.group('ExpandAll Debug');
    
    // Log before state
    const beforeCount = $('.file-tree .collapse.show').length;
    console.log('Collapse elements with .show before:', beforeCount);
    
    // Find all collapse elements in the file-tree and add the show class
    $('.file-tree .collapse').addClass('show');
    
    // Log after state
    const afterCount = $('.file-tree .collapse.show').length;
    console.log('Collapse elements with .show after:', afterCount);
    console.log('Total collapse elements:', $('.file-tree .collapse').length);
    
    // Update aria-expanded attribute for all toggler elements
    $('.file-tree [data-bs-toggle="collapse"]').attr('aria-expanded', 'true');
    
    // Verify the aria-expanded attributes were updated
    const expandedCount = $('.file-tree [data-bs-toggle="collapse"][aria-expanded="true"]').length;
    console.log('Elements with aria-expanded="true":', expandedCount);
    console.groupEnd();
  },
  
  'click #collapseAll'(event, instance) {
    event.preventDefault();
    console.group('CollapseAll Debug');
    
    // Log before state
    const beforeCount = $('.file-tree .collapse.show').length;
    console.log('Collapse elements with .show before:', beforeCount);
    
    // Find all collapse elements in the file-tree and remove the show class
    $('.file-tree .collapse').removeClass('show');
    
    // Log after state
    const afterCount = $('.file-tree .collapse.show').length;
    console.log('Collapse elements with .show after:', afterCount);
    
    // Update aria-expanded attribute for all toggler elements
    $('.file-tree [data-bs-toggle="collapse"]').attr('aria-expanded', 'false');
    
    // Verify the aria-expanded attributes were updated
    const expandedCount = $('.file-tree [data-bs-toggle="collapse"][aria-expanded="false"]').length;
    console.log('Elements with aria-expanded="false":', expandedCount);
    console.groupEnd();
  },
  
  'click #expandAll'(event, instance) {
    event.preventDefault();
    // Find all collapse elements in the file-tree and add the show class
    $('.file-tree .collapse').addClass('show');
    // Update aria-expanded attribute for all toggler elements
    $('.file-tree [data-bs-toggle="collapse"]').attr('aria-expanded', 'true');
  },
  
  'click #collapseAll'(event, instance) {
    event.preventDefault();
    // Find all collapse elements in the file-tree and remove the show class
    $('.file-tree .collapse').removeClass('show');
    // Update aria-expanded attribute for all toggler elements
    $('.file-tree [data-bs-toggle="collapse"]').attr('aria-expanded', 'false');
  },
  
  // Add handler for "Add page after" button
  'click .add-page-after': function(event, instance) {
    event.preventDefault();
    const pageIndex = $(event.currentTarget).data('id');
    // Store the page index to insert after
    $('#insertAfter').val(pageIndex);
    $('#pageInsertionMessage').text(`Please specify the title and image of the new page. This page will be inserted after page ${pageIndex + 1}.`);
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
    const insertAfter = $('#insertAfter').val(); // Get insertion position
    console.log(`Filename: ${file.name}, Title: ${title}, DocumentId: ${documentId}, Insert after: ${insertAfter}`);

    if (file) {
      const upload = Files.insert({
        file: file,
        chunkSize: 'dynamic'
      }, false);

      upload.on('end', function(error, fileObj) {
        if (error) {
          console.log(error);
          alert('Error uploading file');
          $('#submitNewPage').prop('disabled', false);
        } else {
          console.log(fileObj);
          
          // Decide which method to use based on insertion point
          if (insertAfter !== 'end') {
            // Use new method for inserting at a specific index
            Meteor.call('insertPageAtIndex', documentId, fileObj._id, Number(insertAfter), title, function(error, result) {
              if (error) {
                console.error('Error inserting page:', error);
                alert('Error inserting page: ' + (error.reason || error.message));
              } else {
                console.log('Page inserted successfully:', result);
                alert('Page inserted successfully');
                // Clear fields
                $('#pageTitle').val('');
                $('#newpageImage').val('');
                // Reset insertion point back to 'end'
                $('#insertAfter').val('end');
              }
              
              // Re-enable button and close modal
              $('#submitNewPage').prop('disabled', false);
              $('#createPageModal').modal('hide');
            });
          } else {
            // Use original method for adding at the end
            Meteor.call('addPageToDocument', documentId, fileObj._id, 'end', title, function(error, result) {
              if (error) {
                console.error('Error adding page:', error);
                alert('Error adding page: ' + (error.reason || error.message));
              } else {
                console.log('Page added successfully:', result);
                alert('Page added successfully');
                // Clear fields
                $('#pageTitle').val('');
                $('#newpageImage').val('');
                // Reset insertion point back to 'end'
                $('#insertAfter').val('end');
              }
              
              // Re-enable button and close modal
              $('#submitNewPage').prop('disabled', false);
              $('#createPageModal').modal('hide');
            });
          }
        }
      });
      upload.start();
    } else {
      alert('Please select an image file for the page.');
      $('#submitNewPage').prop('disabled', false);
    }
  },

  // Document renaming handlers are already in the code but make sure they work
  'dblclick #documentName'(event, instance) {
    // Hide the document name and show the input box
    $('#documentName').addClass('d-none');
    $('#documentNameInput').removeClass('d-none').focus();
  },
  
  'keypress #documentNameInput'(event, instance) {
    if (event.key === 'Enter') {
      // Get the new document name
      const newTitle = $('#documentNameInput').val().trim();
      const documentId = instance.currentDocument.get();

      if (newTitle) {
        // Call the server method to update the document title
        Meteor.call('modifyDocument', documentId, { title: newTitle }, function(error, result) {
          if (error) {
            console.error("Error updating document:", error);
          } else {
            console.log("Document updated successfully:", result);
          }
        });
      }
      // Revert to display mode
      $('#documentName').text(newTitle).show();
      $('#documentNameInput').hide();
    }
  },
  
  'blur #documentNameInput'(event, instance) {
    // Revert to display when input loses focus
    $('#documentNameInput').addClass('d-none');
    $('#documentName').removeClass('d-none');
  },
  
  // Update addPage click handler to set insertion point to "end"
  'click #addPage': function(event, instance) {
    event.preventDefault();
    // Set insertion point to "end" to add at the end of document
    $('#insertAfter').val('end');
    $('#pageInsertionMessage').text('Please specify the title and image of the new page. This page will be added at the end of the document.');
    $('#createPageModal').modal('show');
  },
  
  // Fix the previous page button by changing lastPage to prevPage
  'click #prevPage'(event, instance) {
    event.preventDefault();
    
    // Critical fix: Stop any other handlers from running
    event.stopImmediatePropagation();
    
    // Ensure currentPage is a number
    const currentPage = Number(instance.currentPage.get());
    console.log("Previous page clicked, current page:", currentPage);
    if (currentPage > 0) {
      // Set the new page as a number
      const newPage = Number(currentPage - 1);
      instance.currentPage.set(newPage);
      console.log("Setting page to:", newPage);
      
      // Update the UI to show correct page number
      const displayPageNumber = newPage + 1; // Display 1-indexed page number
      $('.current-page-indicator').text(displayPageNumber);
      
      // Explicitly fetch the new page data and display it
      const documentId = instance.currentDocument.get();
      if (documentId) {
        const doc = Documents.findOne({_id: documentId});
        if (doc && doc.pages && doc.pages[newPage] && doc.pages[newPage].pageId) {
          const file = Files.findOne({_id: doc.pages[newPage].pageId});
          if (file) {
            $('#pageImage').attr('src', file.link());
            console.log("Image updated to:", file.link());
          } else {
            console.error("File not found for pageId:", doc.pages[newPage].pageId);
          }
        } else {
          console.error("Page not found for index:", newPage);
        }
      }
    } else {
      console.log("Already at first page");
    }
  },
  
  // Update the nextPage handler with strict event control
  'click #nextPage'(event, instance) {
    // Prevent default browser behavior
    event.preventDefault();
    
    // Critical fix: Stop any other handlers from running
    event.stopImmediatePropagation();
    
    // Ensure currentPage is a number
    const currentPage = Number(instance.currentPage.get());
    console.log("Next page clicked, current page:", currentPage);
    const documentId = instance.currentDocument.get();
    
    if (documentId) {
      const doc = Documents.findOne({_id: documentId});
      const totalPages = doc.pages.length;
      if (currentPage < totalPages - 1) {
        // Set the new page as a number, keeping 0-indexed internally
        const newPage = Number(currentPage + 1);
        instance.currentPage.set(newPage);
        
        // Update UI to show correct 1-indexed page number
        const displayPageNumber = newPage + 1;
        $('.current-page-indicator').text(displayPageNumber);
        
        console.log("Setting page to:", newPage, "Display page:", displayPageNumber);
        
        // Add image update logic for consistency with prev button
        if (doc && doc.pages && doc.pages[newPage] && doc.pages[newPage].pageId) {
          const file = Files.findOne({_id: doc.pages[newPage].pageId});
          if (file) {
            $('#pageImage').attr('src', file.link());
            console.log("Image updated to:", file.link());
          } else {
            console.error("File not found for pageId:", doc.pages[newPage].pageId);
          }
        }
      }
    }
  },

  'click #deleteSelection'(event, instance) {
    event.preventDefault();
    console.group('CLIENT: Delete Button Action - Detailed Debug');
    console.time('deleteOperation');
    
    try {
      // Get the selected node from jsTree
      console.log('Getting selected node from jsTree...');
      const tree = $('#documentTree').jstree(true);
      if (!tree) {
        console.error('jsTree not initialized');
        console.timeEnd('deleteOperation');
        console.groupEnd();
        alert('Tree component not initialized. Please try refreshing the page.');
        return;
      }
      
      const selectedNodeIds = tree.get_selected();
      console.log('Selected node IDs:', selectedNodeIds);
      
      if (!selectedNodeIds || selectedNodeIds.length === 0) {
        console.log('Nothing selected to delete');
        console.timeEnd('deleteOperation');
        console.groupEnd();
        alert('Please select an item to delete');
        return;
      }
      
      const selectedNodeId = selectedNodeIds[0]; // Take the first selected node
      const selectedNode = tree.get_node(selectedNodeId);
      
      console.log('Selected node details:', {
        id: selectedNode.id,
        text: selectedNode.text,
        type: selectedNode.type,
        parent: selectedNode.parent
      });
      
      // Extract the node type and path from the node id
      // Node IDs in jsTree are formatted like: page-0-line-0-word-0-glyph-0-element-0
      console.log('Extracting node type and path from ID:', selectedNodeId);
      const parts = selectedNodeId.split('-');
      console.log('Split ID parts:', parts);
      
      if (parts.length < 2) {
        console.error('Invalid node ID format:', selectedNodeId);
        console.timeEnd('deleteOperation');
        console.groupEnd();
        alert('Cannot determine item type to delete (invalid node ID format)');
        return;
      }
      
      // CRITICAL FIX: Instead of using the first part as the type,
      // we need to determine the real item type based on the full path
      // The type we want to delete is the last type in the path
      const path = [];
      let nodeType = '';
      
      // Extract indices from the ID (every odd position)
      console.log('Extracting path indices and determining correct item type...');
      for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 0) {
          // This is a type part (page, line, word, etc.)
          nodeType = parts[i]; // Keep updating, so we'll end with the last type
        } else {
          // This is an index part
          const index = parseInt(parts[i], 10);
          if (isNaN(index)) {
            console.error('Invalid path index in node ID:', selectedNodeId, 'at position', i);
            console.timeEnd('deleteOperation');
            console.groupEnd();
            alert('Cannot determine item path to delete (invalid index in node ID)');
            return;
          }
          path.push(index);
        }
      }
      
      console.log('Extracted node type and path:', {
        nodeType: nodeType,
        path: path,
        pathString: path.join(',')
      });
      
      // Get document ID
      const documentId = instance.currentDocument.get();
      if (!documentId) {
        console.error('No document selected');
        console.timeEnd('deleteOperation');
        console.groupEnd();
        alert('No document selected. Please select a document first.');
        return;
      }
      
      console.log('Current document ID:', documentId);
      
      // Confirm deletion with a more descriptive message based on the item type
      const itemTypeDisplay = nodeType.charAt(0).toUpperCase() + nodeType.slice(1);
      
      // Build a descriptive confirmation message
      let confirmMessage;
      switch(nodeType) {
        case 'page':
          confirmMessage = `Are you sure you want to delete Page ${path[0] + 1} and all its contents (lines, words, etc.)?`;
          break;
        case 'line':
          confirmMessage = `Are you sure you want to delete Line ${path[1] + 1} on Page ${path[0] + 1} and all its contents (words, glyphs, etc.)?`;
          break;
        case 'word':
          confirmMessage = `Are you sure you want to delete Word ${path[2] + 1} from Line ${path[1] + 1} on Page ${path[0] + 1} and all its contents?`;
          break;
        case 'glyph':
          confirmMessage = `Are you sure you want to delete Glyph ${path[3] + 1} from Word ${path[2] + 1}, Line ${path[1] + 1} on Page ${path[0] + 1} and all its contents?`;
          break;
        case 'phoneme':
          confirmMessage = `Are you sure you want to delete Phoneme ${path[3] + 1} from Word ${path[2] + 1}, Line ${path[1] + 1} on Page ${path[0] + 1}?`;
          break;
        case 'element':
          confirmMessage = `Are you sure you want to delete Element ${path[4] + 1} from Glyph ${path[3] + 1}, Word ${path[2] + 1}, Line ${path[1] + 1} on Page ${path[0] + 1}?`;
          break;
        default:
          confirmMessage = `Are you sure you want to delete this ${itemTypeDisplay} and all its children?`;
      }
      
      console.log('Displaying confirmation dialog with message:', confirmMessage);
      
      if (!confirm(confirmMessage)) {
        console.log('Deletion cancelled by user');
        console.timeEnd('deleteOperation');
        console.groupEnd();
        return;
      }
      
      console.log('User confirmed deletion. Calling server method...');
      
      // Call the server method to delete the item
      console.log('Invoking Meteor.call with parameters:', {
        method: 'deleteDocumentItem',
        documentId: documentId,
        nodeType: nodeType,
        path: path
      });
      
      Meteor.call('deleteDocumentItem', documentId, nodeType, path, (error, result) => {
        if (error) {
          console.error('Error from server:', error);
          console.timeEnd('deleteOperation');
          console.groupEnd();
          alert(`Error deleting ${nodeType}: ${error.message}`);
        } else {
          console.log('Server response:', result);
          console.timeEnd('deleteOperation');
          console.log('Item deleted successfully. Refreshing tree...');
          
          // Find and close the tab associated with the deleted item
          console.log('Looking for tab to close with type:', nodeType, 'and id:', path[path.length - 1]);
          
          // Get the tab element based on node type and last index in path
          const tabId = path[path.length - 1];
          const tabToClose = $(`#view-tab-template`).parent().children(`[data-type="${nodeType}"][data-id="${tabId}"]`);
          
          if (tabToClose.length > 0) {
            console.log('Found tab to close:', tabToClose);
            
            // Find the tab to the left that we'll activate
            let tabToActivate = tabToClose.prev(':not(#view-tab-template)');
            
            // If there's no tab to the left, try the tab to the right
            if (tabToActivate.length === 0) {
              tabToActivate = tabToClose.next();
            }
            
            // If still no tab, default to the simple view tab
            if (tabToActivate.length === 0 || tabToActivate.attr('id') === 'view-tab-template') {
              tabToActivate = $('#simple-tab').parent();
            }
            
            console.log('Will activate tab:', tabToActivate.attr('id'));
            
            // Close the tab for the deleted item
            tabToClose.find('.close-tab').click();
            
            // Explicitly activate the selected tab
            if (tabToActivate.length > 0) {
              tabToActivate.children().addClass('active').attr('aria-selected', 'true');
              
              // Also set the current view based on the activated tab
              const activatedType = tabToActivate.attr('data-type') || 'simple';
              instance.currentView.set(activatedType);
              
              // Make sure the appropriate image is visible
              if (activatedType === 'simple') {
                $('#pageImage').show();
                $('img#lineImage, img#wordImage, img#glyphImage, img#elementImage').hide();
              } else if (activatedType === 'line') {
                $('#lineImage').show();
                $('#pageImage, img#wordImage, img#glyphImage, img#elementImage').hide();
              } else if (activatedType === 'word') {
                $('#wordImage').show();
                $('#pageImage, img#lineImage, img#glyphImage, img#elementImage').hide();
              } else if (activatedType === 'glyph') {
                $('#glyphImage').show();
                $('#pageImage, img#lineImage, img#wordImage, img#elementImage').hide();
              } else if (activatedType === 'element') {
                $('#elementImage').show();
                $('#pageImage, img#lineImage, img#wordImage, img#glyphImage').hide();
              }
              
              // Reset toolbox to view mode
              instance.currentTool.set('view');
              resetToolbox();
            }
          }
          
          // Refresh the document tree
          if ($.jstree && $.jstree.reference('#documentTree')) {
            console.log('Reinitializing document tree');
            
            // Add a delay to allow the database to update
            setTimeout(() => {
              initDocumentTree(documentId);
              alert(`${itemTypeDisplay} deleted successfully`);
            }, 300);
          } else {
            console.warn('jsTree reference not available for refresh');
            alert(`${itemTypeDisplay} deleted successfully. Please refresh the page to see changes.`);
          }
          console.groupEnd();
        }
      });
    } catch (err) {
      console.error('Unexpected error in delete handler:', err);
      console.timeEnd('deleteOperation');
      console.groupEnd();
      alert(`An unexpected error occurred: ${err.message}`);
    }
  },

  // ...existing code...
});

// Remove direct jQuery event handlers to ensure no duplication
Meteor.startup(() => {
  Tracker.autorun(() => {
    // Run after templates have rendered
    Meteor.defer(() => {
      // Clean up any directly attached event handlers
      $('#nextPage').off('click.directHandler');
      $('#prevPage').off('click.directHandler');
    });
  });
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
  console.log("DEBUG: resetToolbox - starting to process buttons");
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
      $('#selectItem').removeClass('btn-light').addClass('btn-dark');
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
    if(currentTool == 'select') {
      hideAllToolButtons();
      $('#selectItem').removeClass('btn-light').addClass('btn-dark');
      $('#exitTool').show();
    }
    if(currentTool == 'createPhoneme') {
      hideAllToolButtons();
      $('#createPhoneme').removeClass('btn-light').addClass('btn-dark');
      $('#exitTool').show();
      $('#confirmTool').show();
    }
    if(currentTool == 'createGlyph') {
      hideAllToolButtons();
      $('#createGlyph').removeClass('btn-light').addClass('btn-dark');
      $('#exitTool').show();
      $('#confirmTool').show();
    }
  } else if(currentView == 'glyph') {
      console.log("DEBUG: resetToolbox - in glyph view with tool: " + currentTool);
      if(currentTool == 'view') {
        console.log("DEBUG: resetToolbox - configuring view tool");
        hideAllToolButtons();
        $('.toolbox-container button').removeClass('btn-dark').addClass('btn-light')
        // Show view tool, selectItem, and createElement for glyph view
        $('#viewTool').show();
        $('#selectItem').show();
        $('#createElement').show();
        $('#viewTool').removeClass('btn-light').addClass('btn-dark');
        console.log("DEBUG: resetToolbox - view buttons visibility:", {
          viewTool: $('#viewTool').is(':visible'),
          selectItem: $('#selectItem').is(':visible'),
          createElement: $('#createElement').is(':visible')
        });
      } else if(currentTool == 'select') {
        console.log("DEBUG: resetToolbox - configuring select tool");
        hideAllToolButtons();
        $('#selectItem').removeClass('btn-light').addClass('btn-dark');
        $('#exitTool').show();
      } else if(currentTool == 'createElement') {
        console.log("DEBUG: resetToolbox - configuring createElement tool");
        hideAllToolButtons();
        $('#createElement').removeClass('btn-light').addClass('btn-dark');
        $('#exitTool').show();
        $('#confirmTool').show();
        console.log("DEBUG: resetToolbox - tool buttons visibility:", {
          createElement: $('#createElement').is(':visible'),
          exitTool: $('#exitTool').is(':visible'),
          confirmTool: $('#confirmTool').is(':visible')
        });
      }
  } else if(currentView == 'element') {
    if(currentTool == 'view') {
      console.log("DEBUG: resetToolbox - configuring view tool for element view");
      hideAllToolButtons();
      $('.toolbox-container button').removeClass('btn-dark').addClass('btn-light')
      
      // Show appropriate tools for element view
      $('#viewTool').show();
      $('#viewTool').removeClass('btn-light').addClass('btn-dark');
      
      console.log("DEBUG: resetToolbox - element view buttons visibility:", {
        viewTool: $('#viewTool').is(':visible')
      });
    }
  }
}

//fucntion to generate document flow using gojs
function generateFlow() {

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
  console.log("DEBUG: hideAllToolButtons - hiding all buttons");
  $('.toolbox-container button').hide();
  console.log("DEBUG: hideAllToolButtons - button visibility after hide:", {
    viewTool: $('#viewTool').is(':visible'),
    selectItem: $('#selectItem').is(':visible'),
    createElement: $('#createElement').is(':visible'),
    exitTool: $('#exitTool').is(':visible'),
    confirmTool: $('#confirmTool').is(':visible')
  });
}


//function to set pageImage to a line, word, phoneme, or glyph
function setImage(type, id) {
  // More thorough cleanup - first remove any existing images with this ID
  $('#pageImage').parent().find(`img#${type}Image`).remove();
  
  // Also remove any canvas elements with the same ID
  $('#pageImage').parent().find(`canvas#${type}Image`).remove();
  
  currentDocument = Template.instance().currentDocument.get();
  currentPage = Template.instance().currentPage.get();
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
    // Store the original image in a data attribute for restoration
    $(divId).data('original-src', divId.src);
  }
  if (type == 'word') {
    divId = document.getElementById('wordImage');
  }
  if (type == 'phoneme') {
    divId = document.getElementById('phonemeImage');
  }
  if (type == 'glyph') {
    divId = document.getElementById('glyphImage');
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
  
  // For glyph view, ensure we're using the exact dimensions of the glyph
  if (type === 'glyph') {
    console.log("Setting up cropper specifically for glyph view");
    // Set the canvas dimensions to match the actual image dimensions
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
  } else {
    // For other types, use the standard approach
    canvas.width = image.width;
    canvas.height = image.height;
  }
  
  // Set the height on the canvas style
  canvas.style.height = height;
  
  const context = canvas.getContext('2d');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  xScaling = canvas.width / divId.width;
  yScaling = canvas.height / divId.height;
  console.log("xScaling is " + xScaling + ". yScaling is " + yScaling);
  Template.instance().yScaling.set(canvas.height / divId.height);
  Template.instance().xScaling.set(canvas.width / divId.width);

  //set the width and height of the canvas to the width and height of the div
  canvas.style.width = divId.style.width;
  canvas.style.height = divId.style.height / yScaling;

  //add absolute positioning to the canvas at 0,0
  canvas.style.position = 'absolute';
  canvas.style.left = '0';
  canvas.style.top = '0';
  canvas.style.zIndex = '9999'; 

  //center the canvas vertically
  canvas.style.marginTop = (parseInt(height) - parseInt(canvas.style.height)) / 2 + 'px';

  //set the id to the same id as the div
  canvas.id = divId.id;
  //set the canvas style to the same style as the div
  divId.parentNode.appendChild(canvas);
  divId.style.display = 'none';
  return canvas;
}

//replace the image with a canvas that has the same dimensions and source
function replaceWithOriginalImage() {
  //remove the cropper from the DOM
  const cropper = Template.instance().cropper.get();
  const currentView = Template.instance().currentView.get();
  
  if (cropper) {
    cropper.destroy();
    Template.instance().cropper.set(false);
  }
  
  // More thorough cleanup - remove any cropper containers that might be left
  $('.cropper-container').remove();
  
  // Show the appropriate image based on current view
  if (currentView === 'simple') {
    $('#pageImage').show();
    // Hide all other view-specific images
    $('img#lineImage, img#wordImage, img#glyphImage, img#elementImage').hide();
  } else if(currentView == 'line') {
    $('#lineImage').show();
    // Hide other view-specific images
    $('#pageImage, img#wordImage, img#glyphImage, img#elementImage').hide();
  } else if(currentView == 'word') {
    $('#wordImage').show();
    // Hide other view-specific images
    $('#pageImage, img#lineImage, img#glyphImage, img#elementImage').hide();
  } else if(currentView == 'glyph') {
    $('#glyphImage').show();
    // Hide other view-specific images
    $('#pageImage, img#lineImage, img#wordImage, img#elementImage').hide();
  } else if(currentView == 'element') {
    $('#elementImage').show();
    // Hide other view-specific images
    $('#pageImage, img#lineImage, img#wordImage, img#glyphImage').hide();
  } else {
    // For any other view, keep the pageImage hidden
    $('#pageImage').hide();
  }
  
  // We need to be more selective here - only remove canvas elements that were created
  // for the cropper, not the ones used for drawing rectangles
  if (currentView === 'simple') {
    // In simple view we can clean up all canvas elements except those with specific classes
    $('#pageImage').parent().children('canvas:not(.preserve-canvas)').remove();
  } else {
    // In other views, we only remove canvas elements that have the same ID as our image
    // This ensures we don't remove canvas elements used for drawing rectangles
    const imageId = currentView === 'line' ? 'lineImage' : 
                    currentView === 'word' ? 'wordImage' : 
                    currentView === 'glyph' ? 'glyphImage' : 'pageImage';
    $(`canvas#${imageId}`).remove();
  }
  
  // Fix: remove any extra #wordImage with the "img-fluid" class
  const duplicates = document.querySelectorAll('img#wordImage.img-fluid');
  if (duplicates.length > 1) {
    duplicates.forEach((img, i) => {
      if (i > 0) {
        img.remove();
      }
    });
  }
  
  // Remove any selectElement buttons that might be lingering
  // but ONLY if they were created by the current tool, not others
  const currentTool = Template.instance().currentTool.get();
  if (currentTool === 'createWord' || currentTool === 'createLine' || 
      currentTool === 'createGlyph' || currentTool === 'createPhoneme' ||
      currentTool === 'createElement') {
    $('.selectElement').remove();
  }
  
  console.log("replaceWithOriginalImage: Cleaned up canvas and button elements");
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
      if (doc && doc.pages) {
        doc.pages.forEach(function(page) {
          if (page && page.pageId) {
            const file = Files.findOne({_id: page.pageId});
            if (file) {
              page.image = file.link();
            } else {
              console.error("File not found for pageId:", page.pageId);
              page.image = ""; // Set a default image or empty string
            }
          } else {
            console.error("Invalid page or missing pageId:", page);
          }
        });
      }
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
      // Ensure newPage is a number
      instance.currentPage.set(Number(newPage));
      page = Documents.findOne({_id: instance.currentDocument.get()}).pages[Number(newPage)];
      console.log("Setting page to:", Number(newPage));
      console.log(page);
      //reset the pageImage to the new page's image
      $('#pageImage').attr('src', page.image);
    }
  },
  currentPage() {
    const instance = Template.instance();
    const currentPage = Number(instance.currentPage.get());
    console.log("currentPage is " + currentPage);
    if (currentPage !== null && currentPage !== undefined) {
      const doc = Documents.findOne({_id: instance.currentDocument.get()});
      if (doc && doc.pages && doc.pages[currentPage]) {
        const page = doc.pages[currentPage];
        console.log("Found page:", page);
        
        // Ensure the page has an image property
        if (page && page.pageId) {
          const file = Files.findOne({_id: page.pageId});
          if (file) {
            page.image = file.link();
          } else {
            console.error("File not found for pageId:", page.pageId);
          }
        }
        
        return page;
      } else {
        console.error("Page not found for index:", currentPage);
        return false;
      }
    } else {
      return false;
    }
  },
  currentPageNumber() {
    const instance = Template.instance();
    const currentPage = parseInt(instance.currentPage.get());
    if (currentPage !== null && currentPage !== undefined) {
      // Always display 1-indexed page numbers to users
      return currentPage + 1;
    } else {
      return 1;
    }
  },
  
  currentLine() {
    const instance = Template.instance();
    return instance.currentLine.get();
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
    const instance = Template.instance();
    const documentId = instance.currentDocument.get();
    if (documentId) {
      const doc = Documents.findOne({_id: documentId});
      if (doc && doc.pages) {
        console.log("Total pages found:", doc.pages.length);
        return doc.pages.length;
      }
    }
    return 0;
  },
  jsTreeInitialized() {
    return $.fn.jstree && $('#documentTree').data('jstree') !== undefined;
  },
  // Helper to generate data for each page in the document
  pageInDocument() {
    const instance = Template.instance();
    const documentId = instance.currentDocument.get();
    
    if (!documentId) return [];
    
    const doc = Documents.findOne({_id: documentId});
    if (!doc || !doc.pages) return [];
    
    return doc.pages.map((page, index) => {
      // Get page image URL
      let pageImage = "";
      if (page.pageId) {
        const file = Files.findOne({_id: page.pageId});
        if (file) {
          pageImage = file.link();
        }
      }
      
      // Safe display number conversion
      const displayNumber = index + 1;
      
      // Handle title safely
      // Only use custom title if it exists and is not the default "Page X" format
      let pageTitle = "";
      if (page.title && typeof page.title === 'string') {
        // Don't include title if it's already in "Page X" format
        if (!page.title.startsWith(`Page ${displayNumber}`)) {
          pageTitle = page.title;
        }
      }
      
      return {
        page: index,
        displayNumber: displayNumber,
        pageImage: pageImage,
        pageTitle: pageTitle
      };
    });
  },
  
  // Helper to check if a page is the current page
  isCurrentPage(pageIndex) {
    const instance = Template.instance();
    return Number(instance.currentPage.get()) === Number(pageIndex);
  },
  
  // Helper to get page title
  pageTitle(pageIndex) {
    const instance = Template.instance();
    const documentId = instance.currentDocument.get();
    
    if (documentId && pageIndex !== undefined) {
      const doc = Documents.findOne({_id: documentId});
      if (doc && doc.pages && doc.pages[pageIndex]) {
        return doc.pages[pageIndex].title || `Page ${pageIndex + 1}`;
      }
    }
    return `Page ${pageIndex + 1}`;
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
    // Log the current state
    const currentView = instance.currentView.get();
    console.log(`Exiting tool in view: ${currentView}`);
    
    // Reset tool state
    instance.currentTool.set('view');
    resetToolbox();
    replaceWithOriginalImage();
    
    // Make sure appropriate images are visible based on current view
    if (currentView !== 'simple') {
      // If we're in a specialized view (like glyph), make sure pageImage stays hidden
      $('#pageImage').hide();
      
      // Also ensure we're showing the right image (lineImage, wordImage, or glyphImage)
      if (currentView === 'line') {
        $('#lineImage').show();
      } else if (currentView === 'word') {
        $('#wordImage').show();
      } else if (currentView === 'glyph') {
        $('#glyphImage').show();
      }
    }
    
    // Ensure the selection boxes disappear
    $('.selectElement').remove();
    $('.showReferences').remove();
    setCurrentHelp("You can use [Shift] + Scroll to zoom in and out of the page image.");
  },
  
  'click #lastPage'(event, instance) {
    event.preventDefault();
    // Ensure currentPage is a number
    const currentPage = Number(instance.currentPage.get());
    console.log("Last page clicked, current page:", currentPage);
    if (currentPage > 0) {
      // Set the new page as a number
      const newPage = Number(currentPage - 1);
      instance.currentPage.set(newPage);
      console.log("Setting page to:", newPage);
      
      // Update the UI to show correct page number
      const displayPageNumber = newPage + 1; // Display 1-indexed page number
      $('.current-page-indicator').text(displayPageNumber);
      
      // Explicitly fetch the new page data and display it
      const documentId = instance.currentDocument.get();
      if (documentId) {
        const doc = Documents.findOne({_id: documentId});
        if (doc && doc.pages && doc.pages[newPage] && doc.pages[newPage].pageId) {
          const file = Files.findOne({_id: doc.pages[newPage].pageId});
          if (file) {
            $('#pageImage').attr('src', file.link());
            console.log("Image updated to:", file.link());
          } else {
            console.error("File not found for pageId:", doc.pages[newPage].pageId);
          }
        } else {
          console.error("Page not found for index:", newPage);
        }
      }
    } else {
      console.log("Already at first page");
    }
  },
  'click #nextPage'(event, instance) {
    event.preventDefault();
    
    // Critical fix: Stop any other handlers from running
    event.stopImmediatePropagation();
    
    // Ensure currentPage is a number
    const currentPage = Number(instance.currentPage.get());
    const documentId = instance.currentDocument.get();
    if (documentId) {
      const doc = Documents.findOne({_id: documentId});
      const totalPages = doc.pages.length;
      if (currentPage < totalPages - 1) {
        // Set the new page as a number, keeping 0-indexed internally
        const newPage = Number(currentPage + 1);
        instance.currentPage.set(newPage);
        
        // Update UI to show correct 1-indexed page number
        const displayPageNumber = newPage + 1;
        $('.current-page-indicator').text(displayPageNumber);
        
        console.log("Setting page to:", newPage, "Display page:", displayPageNumber);
      }
    }
  },
  'click .changePage'(event, instance) {
    event.preventDefault();
    //get data-id attribute from the button using pure javascript
    // Ensure page is a number
    const page = Number(event.currentTarget.getAttribute('data-id'));
    console.log("changePage to " + page);
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
    Meteor.call('modifyDocument', documentId, doc, function(error, result) {
      if (error) {
        console.error("Error updating document:", error);
      } else {
        console.log("Document updated successfully:", result);
      }
    });
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
    // Ensure the selection boxes appear immediately
    replaceWithOriginalImage();
  }
  if(currentView == 'line') {
    //get $('#lineImage') and change it from img-fluid to a calculated width and height
    calcWidth = $('#lineImage').width();
    calcHeight = $('#lineImage').height();
    $('#lineImage').removeClass('img-fluid');
    //add width and height to the lineImage's style
    $('#lineImage').css('width', calcWidth + 'px');
    $('#lineImage').css('height', calcHeight + 'px');
    
    // Store original image source and visibility state for restoration
    const originalSrc = $('#lineImage').attr('src');
    
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
    
    // Ensure the selection boxes appear immediately but also make sure lineImage is visible
    replaceWithOriginalImage();
    
    // Make sure lineImage is shown and has the original source
    $('#lineImage').show();
    if (originalSrc) {
      $('#lineImage').attr('src', originalSrc);
    }
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
    // Ensure the selection boxes appear immediately
    replaceWithOriginalImage();
  }
  if(currentView == 'glyph') {
    // Instead of just exiting the tool, implement element selection
    console.log("Initializing element selection in glyph view");
    
    // Get calculated dimensions of the glyph image
    calcWidth = $('#glyphImage').width();
    calcHeight = $('#glyphImage').height();
    $('#glyphImage').removeClass('img-fluid');
    // Add width and height to the glyphImage's style
    $('#glyphImage').css('width', calcWidth + 'px');
    $('#glyphImage').css('height', calcHeight + 'px');
    
    // Initialize the cropper
    image = initCropper("glyph");
    const context = image.getContext('2d');
    
    // Get document and glyph data
    const page = instance.currentPage.get();
    const documentId = instance.currentDocument.get();
    const doc = Documents.findOne({_id: documentId});
    const lineId = instance.currentLine.get();
    const wordId = instance.currentWord.get();
    const glyphId = instance.currentGlyph.get();
    
    // Access the word to get its glyph
    const line = doc.pages[page].lines[lineId];
    const word = line.words[wordId];
    const glyphsArray = word.glyphs || word.glyph || [];
    const glyph = glyphsArray[glyphId];
    
    // Check if the glyph has elements
    const elements = glyph.elements || [];
    
    // If there are no elements, show a message and exit
    if (elements.length === 0) {
      alert("No elements to display. Use the Create Element tool to create elements within this glyph.");
      $('#exitTool').click();
      return;
    }
    
    console.log(`Found ${elements.length} elements to display in glyph view`);
    
    // Sort elements by their x coordinate
    elements.sort(function(a, b) {
      return a.x - b.x;
    });
    
    // Draw buttons for each element
    elements.forEach(function(element, index) {
      console.log(`Drawing element button at: x=${element.x}, y=${element.y}, w=${element.width}, h=${element.height}`);
      drawButton(image, element.x, element.y, element.width, element.height, 'element', index, index);
    });
    
    setCurrentHelp('To select an element, click on it. To cancel, click the close tool button.');
    // Ensure the selection boxes appear immediately
    replaceWithOriginalImage();
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
    const tabId = event.target.getAttribute('data-tab-id');
    $(event.target).attr('aria-selected', 'true').addClass('active');

    // Close child tabs when a parent tab is clicked
    const clickedTabElement = $(event.target).closest('li');
    const clickedTabId = clickedTabElement.attr('id');
    if (clickedTabId) {
      $('#view-tab-template').parent().children(`[data-parent="${clickedTabId}"]`).each(function() {
        $(this).find('.close-tab').click();
      });
    }

    // First ensure image-container is visible for all tab types except flow
    if(tabId !== 'flow') {
      $('#image-container').show();
    }

    // Handle tab-specific logic
    if (tabId === 'flow') {
      // hide the image-container
      $('#image-container').hide();
      instance.currentView.set('flow');
      instance.currentTool.set('view');
      resetToolbox();
      // hide the image-container class
      $('.image-container').hide();
      // show the flow-container by removing display none
      $('.flow-container').show();
      // generate the drawflow
      generateFlow();
    } else if(tabId == 'line') {
      // Hide all images first
      $('#pageImage, img#wordImage, img#glyphImage, img#elementImage').hide();
      
      instance.currentView.set('line');
      instance.currentTool.set('view');
      resetToolbox();
      // get the currentLine
      currentLine = instance.currentLine.get();
      setImage('line', currentLine);
      
      // Ensure line image is visible
      $('#lineImage').show();
    } else if(tabId == 'word') {
      // Hide all images first
      $('#pageImage, img#lineImage, img#glyphImage, img#elementImage').hide();
      
      instance.currentView.set('word');
      instance.currentTool.set('view');
      resetToolbox();
      // get the currentLine
      currentLine = instance.currentLine.get();
      // get the currentWord
      currentWord = instance.currentWord.get();
      setImage('word', currentWord);
      
      // Ensure word image is visible
      $('#wordImage').show();
    } else if(tabId == 'glyph') {
      // Hide all images first
      $('#pageImage, img#lineImage, img#wordImage, img#elementImage').hide();
      
      instance.currentView.set('glyph');
      instance.currentTool.set('view');
      resetToolbox();
      // get the currentLine
      currentLine = instance.currentLine.get();
      // get the currentWord
      currentWord = instance.currentWord.get();
      // get the currentGlyph
      currentGlyph = instance.currentGlyph.get();
      setImage('glyph', currentGlyph);
      
      // Ensure glyph image is visible
      $('#glyphImage').show();
    } else if(tabId == 'element') {
      // Hide all images first
      $('#pageImage, img#lineImage, img#wordImage, img#glyphImage').hide();
      
      instance.currentView.set('element');
      instance.currentTool.set('view');
      resetToolbox();
      // get the current element
      const elementId = instance.currentElement ? instance.currentElement.get() : null;
      if (elementId !== null) {
        setElementImage(elementId, instance);
        
        // Ensure element image is visible
        $('#elementImage').show();
      }
    } else if(tabId == 'simple'){
      // Hide all other images first
      $('img#lineImage, img#wordImage, img#glyphImage, img#elementImage').hide();
      
      instance.currentView.set('simple');
      instance.currentTool.set('view');
      resetToolbox();
      
      // Also remove any canvas elements that might have been created
      $('canvas#lineImage, canvas#wordImage, canvas#glyphImage, canvas#elementImage').remove();
      
      // Show the page image
      $('#pageImage').show();
      
      // Call this to ensure cropper instances are cleaned up
      replaceWithOriginalImage();
    }
  },
  
  'click .close-tab' (event, instance) {
    event.preventDefault();
    const grandparent = event.target.parentElement.parentElement;
    const type = grandparent.getAttribute('data-type');
    const closedTabId = grandparent.getAttribute('id');

    // Close child tabs
    if (closedTabId) {
      $('#view-tab-template').parent().children(`[data-parent="${closedTabId}"]`).each(function() {
        $(this).find('.close-tab').click();
      });
    }

    // Handle type-specific cleanup
    if (type === 'line') {
      instance.currentLine.set(false);
      $('img#lineImage').remove();
    } else if (type === 'word') {
      instance.currentWord.set(false);
      $('img#wordImage').remove();
    } else if (type === 'glyph') {
      instance.currentGlyph.set(false);
      $('img#glyphImage').remove();
    } else if (type === 'element') {
      if (instance.currentElement) instance.currentElement.set(false);
      $('img#elementImage').remove();
    }

    // Remove the tab
    grandparent.remove();
    
    // Check if there are any remaining tabs (other than the template tab)
    const remainingTabs = $('#view-tab-template').parent().children().not('#view-tab-template');
    if (remainingTabs.length <= 1) { // Just the Simple View tab remains
      // Switch to Simple View
      instance.currentView.set('simple');
      $('#simple-tab').addClass('active').attr('aria-selected', 'true');
      
      // Remove all view-specific images
      $('img#lineImage, img#wordImage, img#glyphImage, img#elementImage').remove();
      
      // Show page image
      $('#pageImage').show();
    } else {
      // Find the active tab and ensure its image is visible
      const activeTab = $('#view-tab-template').parent().children().find('.active').first();
      if (activeTab.length > 0) {
        const activeTabId = activeTab.attr('data-tab-id');
        if (activeTabId === 'line') {
          $('img#lineImage').show();
        } else if (activeTabId === 'word') {
          $('img#wordImage').show();
        } else if (activeTabId === 'glyph') {
          $('img#glyphImage').show();
        } else if (activeTabId === 'element') {
          $('img#elementImage').show();
        } else if (activeTabId === 'simple') {
          $('#pageImage').show();
        }
      }
    }
    
    resetToolbox();
  },
  
  'click #searchGlyphs'(event, instance) {
    event.preventDefault();
    instance.currentTool.set('searchGlyphs');
    resetToolbox();
    //set the currentTool to btn-dark
    $('#searchGlyphs').removeClass('btn-light').addClass('btn-dark');
    setCurrentHelp(false);
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
      
      // Automatically exit the createLine tool and reset to view mode
      instance.currentTool.set('view');
      resetToolbox();
      replaceWithOriginalImage();
      setCurrentHelp("You can use [Shift] + Scroll to zoom in and out of the page image.");
    } else if(currentTool == 'createWord') {
      //document, page, line, x, width, wordOrder=false, word=false
      ret = Meteor.callAsync('addWordToLine', instance.currentDocument.get(), instance.currentPage.get(), instance.currentLine.get(), instance.selectx1.get(), instance.selectwidth.get());
      alert("word added");
      //find the cropper and destroy it
      $('.cropper-container').remove();
      $('#pageImage').removeClass('cropper-hidden');
      
      // Automatically exit the createWord tool and reset to view mode
      instance.currentTool.set('view');
      resetToolbox();
      replaceWithOriginalImage();
      setCurrentHelp("You can use [Shift] + Scroll to zoom in and out of the page image.");
      // Ensure we're in line view and the lineImage is visible
      if (instance.currentView.get() === 'line') {
        $('#lineImage').show();
      }
    } else if(currentTool == 'createPhoneme') {
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
      const glyphImage = document.getElementById('glyphImage');
      const canvas = document.createElement('canvas');
      canvas.width = instance.selectwidth.get();
      canvas.height = instance.selectheight.get();
      const context = canvas.getContext('2d');
      
      // Extract the element image from the glyph 
      context.drawImage(
        glyphImage, 
        instance.selectx1.get(),
        instance.selecty1.get(),
        instance.selectwidth.get(), 
        instance.selectheight.get(),
        0, 0, 
        canvas.width, canvas.height
      );
      
      // Get image data
      const elementImageData = canvas.toDataURL('image/png');
      
      // Call modified server method with image data
      ret = Meteor.callAsync('addElementToGlyph', 
        instance.currentDocument.get(), 
        instance.currentPage.get(), 
        instance.currentLine.get(),
        instance.currentWord.get(),
        instance.currentGlyph.get(),
        instance.selectx1.get(),
        instance.selecty1.get(),
        instance.selectwidth.get(),
        instance.selectheight.get(),
        elementImageData  // Pass image data
      );
      alert("element added");
      
      // Clean up the cropper
      $('.cropper-container').remove();
      $('#pageImage').removeClass('cropper-hidden');
      
      // Reset to view mode at glyph level
      instance.currentTool.set('view');
      resetToolbox();
      replaceWithOriginalImage();
      // Make sure we stay in glyph view and the glyphImage is visible
      if (instance.currentView.get() === 'glyph') {
        $('#glyphImage').show();
      }
      
      // Reset help text
      setCurrentHelp("You can use [Shift] + Scroll to zoom in and out of the image.");
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
    // Set a flag to indicate successful save before hiding the modal
    Session.set('glyphSaved', true);
    //close the modal and destroy the glyphImageDraw
    $('#createGlyphModal').modal('hide');
    // Remove ALL instances of glyphImageDraw
    $('[id="glyphImageDraw"]').remove();
  },
  // Event handler for when the Create Glyph modal is hidden (after cancel or close button clicked)
  'hidden.bs.modal #createGlyphModal'(event, instance) {
    console.log("Create Glyph modal was closed");
    // Only clear the canvas if we didn't just save a glyph
    const wasSaved = Session.get('glyphSaved');
    if (!wasSaved) {
      console.log("Clearing canvas because modal was canceled");
      // Clear the main glyph canvas
      const glyphCanvas = document.getElementById('glyphCanvas');
      if (glyphCanvas) {
        const context = glyphCanvas.getContext('2d');
        context.clearRect(0, 0, glyphCanvas.width, glyphCanvas.height);
      }
    }
    // Always remove the drawing canvas to prevent duplicates
    // Use a more thorough selector to catch all instances
    $('[id="glyphImageDraw"]').remove();
    
    // Reset the saved flag for next time
    Session.set('glyphSaved', false);
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
      // Set a higher zIndex to ensure the cropper appears above other elements
      zIndex: 9999,
      crop(event) {
        cropDetails = event.detail;
        instance.selectx1.set(cropDetails.x);
        instance.selecty1.set(cropDetails.y);
        instance.selectwidth.set(cropDetails.width);
        instance.selectheight.set(cropDetails.height);
      }
    });
    // Store the cropper instance to properly clean it up later
    instance.cropper.set(cropper);
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
    $('#createGlyph').removeClass('btn-light').addClass('btn-dark');
    instance.currentTool.set('createGlyph');
    resetToolbox();

    const image = initCropper('word');
    const context = image.getContext('2d');
    const page = instance.currentPage.get();
    const documentId = instance.currentDocument.get();
    const doc = Documents.findOne({_id: documentId});
    const lineId = instance.currentLine.get();
    const wordId = instance.currentWord.get();
    const word = doc.pages[page].lines[lineId].words[wordId];

    const glyphs = word.glyphs || word.glyph || [];
    glyphs.sort((a, b) => a.x - b.x);
    glyphs.forEach(function(g, index) {
      console.log("drawing glyph");
      drawRect(image, g.x, 0, g.width, image.height, 'glyph', index, index);
    });

    setCurrentHelp('To create a bounding box for a new glyph, use the selection. Hit Enter to confirm or close to cancel.');
    image.style.display = 'block';
    image.style.maxWidth = '100%';

    const cropper = new Cropper(image, {
      dragMode: 'crop',
      aspectRatio: 0,
      crop(event) {
        const cropDetails = event.detail;
        instance.selectx1.set(cropDetails.x);
        instance.selecty1.set(cropDetails.y);
        instance.selectwidth.set(cropDetails.width);
        instance.selectheight.set(cropDetails.height);
      }
    });
  },
  'click #createElement'(event, instance) {
    event.preventDefault();
    console.log("DEBUG: createElement click handler - start");
    console.log("createElement, drawing is " + instance.drawing.get());
    
    // Set the currentTool to createElement first
    console.log("DEBUG: createElement - setting tool state");
    instance.currentTool.set('createElement');
    
    // Update button appearance
    $('#createElement').removeClass('btn-light').addClass('btn-dark');
    
    // Call resetToolbox after setting the tool state
    console.log("DEBUG: createElement - calling resetToolbox");
    resetToolbox();
    
    console.log("DEBUG: createElement - tool buttons visibility after resetToolbox:", {
      createElement: $('#createElement').is(':visible'),
      exitTool: $('#exitTool').is(':visible'),
      confirmTool: $('#confirmTool').is(':visible')
    });
    
    // Initialize cropper for the glyph image
    console.log("DEBUG: createElement - initializing cropper");
    image = initCropper('glyph');
    
    // Get the glyph data to set appropriate crop boundaries
    const documentId = instance.currentDocument.get();
    const page = instance.currentPage.get();
    const lineId = instance.currentLine.get();
    const wordId = instance.currentWord.get();
    const glyphId = instance.currentGlyph.get();
    
    const doc = Documents.findOne({_id: documentId});
    if (doc) {
      console.log("DEBUG: createElement - found document");
      const line = doc.pages[page].lines[lineId];
      const word = line.words[wordId];
      const glyphsArray = word.glyphs || word.glyph || [];
      const glyph = glyphsArray[glyphId];
      
      if (glyph) {
        console.log("DEBUG: createElement - found glyph with dimensions:", {
          width: glyph.width,
          height: line.height
        });
        
        // Show bounding boxes for existing elements
        const elements = glyph.elements || [];
        elements.forEach((element, index) => {
          console.log("drawing existing element bounding box");
          drawRect(image, element.x, element.y, element.width, element.height, 'element', index, index);
        });
      }
    }
    
    setCurrentHelp('To create a bounding box to represent an element in the glyph, use the cropping bounds to select the area that contains the element. Click Confirm when done or Exit to cancel.');
    
    // Set the image css to display block and max-width 100%
    image.style.display = 'block';
    image.style.maxWidth = '100%';
    
    // Create a cropper object for the glyphImage with strict constraints
    cropDetails = {};
    const cropper = new Cropper(image, {
      dragMode: 'crop',
      aspectRatio: 0,
      viewMode: 1,        // Restrict the crop box to not exceed the size of the canvas
      autoCropArea: 1,    // Make the crop box cover the entire canvas by default
      movable: false,     // Prevent the image from being moved inside the canvas
      zoomable: false,    // Disable zooming
      rotatable: false,   // Disable rotation
      scalable: false,    // Disable scaling
      zoomOnTouch: false, // Disable zoom on touch
      zoomOnWheel: false, // Disable zoom on wheel
      minCropBoxWidth: 10,
      minCropBoxHeight: 10,
      crop(event) {
        cropDetails = event.detail;
        instance.selectx1.set(cropDetails.x);
        instance.selecty1.set(cropDetails.y);
        instance.selectwidth.set(cropDetails.width);
        instance.selectheight.set(cropDetails.height);
        
        // Log the crop details for debugging
        console.log("Crop details:", {
          x: cropDetails.x,
          y: cropDetails.y,
          width: cropDetails.width,
          height: cropDetails.height,
          canvasWidth: image.width,
          canvasHeight: image.height
        });
      }
    });
    
    // Store the cropper instance to destroy it later
    instance.cropper.set(cropper);
    
    // Set initial crop box to a reasonable size in the center of the glyph
    // We want to start with something smaller than the full glyph
    cropper.setCropBoxData({
      left: image.width * 0.25,     // Start at 25% from left
      top: image.height * 0.25,     // Start at 25% from top
      width: image.width * 0.5,     // Width is 50% of glyph width
      height: image.height * 0.5    // Height is 50% of glyph height
    });
    
    // Add a check to ensure the container is properly sized
    setTimeout(() => {
      const container = $('.cropper-container');
      const canvas = $('.cropper-canvas');
      const dragBox = $('.cropper-drag-box');
      
      console.log("Cropper dimensions:", {
        container: {
          width: container.width(),
          height: container.height()
        },
        canvas: {
          width: canvas.width(),
          height: canvas.height()
        },
        dragBox: {
          width: dragBox.width(),
          height: dragBox.height()
        },
        image: {
          width: image.width,
          height: image.height
        }
      });
    }, 500);
    
    console.log("DEBUG: createElement - end of handler");
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
              // Clear these fields
              $('#pageTitle').val('');
              $('#newpageImage').val('');
              // Re-enable and close
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
  'dblclick #documentName'(event, instance) {
    // Hide the document name and show the input box
    $('#documentName').hide();
    $('#documentNameInput').show().focus();
  },
  'keypress #documentNameInput'(event, instance) {
    if (event.key === 'Enter') {
      // Get the new document name
      const newTitle = $('#documentNameInput').val().trim();
      const documentId = instance.currentDocument.get();
      doc = Documents.findOne({_id: documentId});
      doc.title = newTitle;

      if (newTitle) {
        // Call the server method to update the document title
        Meteor.call('modifyDocument', documentId, doc, function(error, result) {
          if (error) {
            console.error('Error updating document title:', error);
            alert('Failed to update document title.');
          } else {
            console.log('Document title updated successfully.');
            // Update the UI
            $('#documentName').text(newTitle).show();
            $('#documentNameInput').hide();
          }
        });
      } else {
        // If the input is empty, revert to the original title
        $('#documentName').show();
        $('#documentNameInput').hide();
      }
    }
  },
  'blur #documentNameInput'(event, instance) {
    // Revert to the original title if the input loses focus
    $('#documentName').show();
    $('#documentNameInput').hide();
  },
  'click #clearCanvas'(event, instance) {
    console.log("clearCanvas");
    const context = $('#glyphImageDraw')[0].getContext('2d');
    context.clearRect(0, 0, 200, 200);
  },
  // Handle page selection click
  'click .pagesel'(event, instance) {
    // Don't trigger page change if clicking on the control buttons
    if ($(event.target).closest('.page-controls').length) {
      return;
    }
    
    // Get the 0-indexed page number from data attribute
    const pageIndex = Number($(event.currentTarget).data('id'));
    console.log("Page selected:", pageIndex, "Display page:", pageIndex + 1);
    
    if (!isNaN(pageIndex)) {
      // Set current page (0-indexed internally)
      instance.currentPage.set(pageIndex);
      
      // Update UI to show 1-indexed page number
      $('.current-page-indicator').text(pageIndex + 1);
      
      // Update the page image
      const documentId = instance.currentDocument.get();
      if (documentId) {
        const doc = Documents.findOne({_id: documentId});
        if (doc && doc.pages && doc.pages[pageIndex] && doc.pages[pageIndex].pageId) {
          const file = Files.findOne({_id: doc.pages[pageIndex].pageId});
          if (file) {
            $('#pageImage').attr('src', file.link());
          }
        }
      }
    }
  },
  
  // Handle sidebar tab switching
  'shown.bs.tab #sidebarTabs .nav-link'(event, instance) {
    const tabId = $(event.target).attr('data-bs-target');
    
    if (tabId === '#page-selection-content') {
      // After switching to page selection tab, scroll to the active page
      setTimeout(() => {
        const activePage = $('#page-selection-content .active-page');
        if (activePage.length) {
          const container = $('#page-selection-content .page-thumbnails');
          container.animate({
            scrollTop: activePage.position().top + container.scrollTop() - container.height()/2 + activePage.height()/2
          }, 200);
        }
      }, 100);
    }
  }
});

// Ensure sidebar tabs are initialized correctly on render
Template.viewPage.onRendered(function() {
  const instance = this;
  
  // Initialize Bootstrap tabs
  const tabEl = document.querySelector('#page-selection-tab');
  if (tabEl) {
    const tab = new bootstrap.Tab(tabEl);
  }
  
  // Update page selection when document/page changes
  this.autorun(() => {
    const currentPage = instance.currentPage.get();
    const currentDocument = instance.currentDocument.get();
    
    // If both document and page are set and the page selection tab is visible, highlight the current page
    if (currentDocument && currentPage !== undefined && 
        $('#page-selection-tab').hasClass('active')) {
      setTimeout(() => {
        const activePage = $(`#page-selection-content .pagesel[data-id="${currentPage}"]`);
        if (activePage.length) {
          const container = $('#page-selection-content .page-thumbnails');
          container.animate({
            scrollTop: activePage.position().top + container.scrollTop() - container.height()/2 + activePage.height()/2
          }, 200);
        }
      }, 100);
    }
  });
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

  // Check if a tab with the same type and id already exists
  const existingTab = $(`#view-tab-template`).parent().children(`[data-type="${type}"][data-id="${id}"]`);
  if (existingTab.length > 0) {
    console.log(`Tab for ${type} ${id} already exists. Redirecting to the existing tab.`);
    
    // Clean up any overlay elements that might be active
    $('.selectElement').remove();
    $('.showReferences').remove();
    
    // Clean up any cropper instances
    const cropper = instance.cropper.get();
    if (cropper) {
      cropper.destroy();
      instance.cropper.set(false);
    }
    
    // Clean up any canvas elements that might be lingering
    $('canvas#pageImage, canvas#lineImage, canvas#wordImage, canvas#glyphImage').each(function() {
      // Only remove canvas duplicates, not the original images
      if ($(this).siblings('img#' + this.id).length) {
        $(this).remove();
      }
    });
    // Make sure the exit tool is triggered to clean up any active tools
    if ($('#exitTool').is(':visible')) {
      $('#exitTool').click();
    }
    
    // Activate the existing tab
    existingTab.children().addClass('active').attr('aria-selected', 'true');
    
    // Deactivate other tabs
    existingTab.siblings().children().removeClass('active').attr('aria-selected', 'false');
    
    // Set the current view to match the tab type
    instance.currentView.set(type);
    
    // Reset toolbox to show appropriate tools for this view
    instance.currentTool.set('view');
    resetToolbox();
    
    // Make sure the appropriate image is shown based on the tab type
    if (type === 'element') {
      setElementImage(id, instance);
    } else {
      setImage(type, id);
    }
    
    // Ensure no selection buttons remain
    setTimeout(() => {
      $('.selectElement').remove();
      $('.showReferences').remove();
      console.log(`Selection cleanup complete for existing tab ${type} ${id}`);
    }, 100);
    
    return; // Exit early to prevent creating a duplicate tab
  }
  
  // Clean up all overlay buttons before proceeding 
  // This ensures previous selection elements don't remain on screen
  $('.selectElement').remove();
  $('.showReferences').remove();
  
  // Also clean up any cropper instances
  const cropper = instance.cropper.get();
  if (cropper) {
    cropper.destroy();
    instance.cropper.set(false);
  }
  
  // Clean up any canvas elements that might be lingering
  $('canvas#pageImage, canvas#lineImage, canvas#wordImage, canvas#glyphImage').each(function() {
    // Only remove canvas duplicates, not the original images
    if ($(this).siblings('img#' + this.id).length) {
      $(this).remove();
    }
  });
  //simulate clicking the exitTool button
  $('#exitTool').click();
  
  // Close other tabs at the same level
  $('#view-tab-template').parent().children(`[data-type="${type}"]`).each(function() {
    if ($(this).attr('data-id') !== id) {
      $(this).find('.close-tab').click();
    }
  });
  
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
  if (type == 'element') {
    parentId = instance.currentGlyph.get();
    wordId = instance.currentWord.get();
    lineId = instance.currentLine.get();
    parenttab = "view-tab-element-glyph-" + parentId;
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
  //prepend <type> uppercase and id to the clone's button text, incremented by 1 for user-friendly display
  const displayId = parseInt(id) + 1; // Increment by 1 for display
  clone.children().prepend(type.charAt(0).toUpperCase() + type.slice(1) + ' ' + displayId + ' ');
  //set the current view to the type
  instance.currentView.set(type);
  resetToolbox();
  
  // Add special handling for element type
  if (type === 'element') {
    setElementImage(id, instance);
  } else {
    setImage(type, id);
  }
  
  // Final cleanup - ensure no selection buttons remain
  // This redundant check helps catch any buttons that might have been created 
  // during the setImage or other operations above
  setTimeout(() => {
    $('.selectElement').remove();
    $('.showReferences').remove();
    console.log(`Selection cleanup complete for ${type} ${id}`);
  }, 100);
}

// Function to set image for an element within a glyph
function setElementImage(id, instance) {
  // Delete any images with img-fluid class
  $('#pageImage').parent().children('img.img-fluid').remove();
  
  // Get document and element data
  const currentDocument = instance.currentDocument.get();
  const currentPage = instance.currentPage.get();
  const currentLine = instance.currentLine.get();
  const currentWord = instance.currentWord.get();
  const currentGlyph = instance.currentGlyph.get();
  
  const doc = Documents.findOne({_id: currentDocument});
  
  // Delete any canvas elements to start fresh
  $('#pageImage').parent().children('canvas').remove();
  
  // Get the glyph image as source
  const glyphImg = $('#glyphImage');
  const imagesrc = $('#glyphImage').attr('src');
  
  // Create a new image from the glyph
  const image = new Image();
  image.src = imagesrc;
  
  // Get the glyph and element data
  const line = doc.pages[currentPage].lines[currentLine];
  const word = line.words[currentWord];
  const glyphsArray = word.glyphs || word.glyph || [];
  const glyph = glyphsArray[currentGlyph];
  const elements = glyph.elements || [];
  const element = elements[id];
  
  if (!element) {
    console.error("Element not found:", id);
    return;
  }
  
  // Create a canvas for the element
  const canvas = document.createElement('canvas');
  canvas.width = element.width;
  canvas.height = element.height;
  
  // Get the context and draw the element part of the glyph
  const context = canvas.getContext('2d');
  context.drawImage(image, element.x, element.y, element.width, element.height, 0, 0, element.width, element.height);
  
  // Get the data URL
  const dataURL = canvas.toDataURL('image/png');
  
  // Clone the page image and set up the element image
  const clone = glyphImg.clone();
  clone.attr('id', 'elementImage');
  clone.attr('src', dataURL);
  clone.removeClass();
  clone.addClass('img-fluid');
  clone.removeAttr('style');
  
  // Append and show the element image
  glyphImg.parent().append(clone);
  clone.show();
  glyphImg.hide();
  
  // Store the current element ID
  instance.currentElement = new ReactiveVar(id);
  
  console.log(`Element image set for element ${id}`);
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
  const xScaling = canvasOffset.width / context.canvas.width;

  let defaultClass = 'selectElement';
  //draw the button at the x, y, width, and height 
  button.style.position = 'absolute';
  button.style.left = (x * xScaling) + 'px';
  button.style.top = (y * xScaling) + 'px';
  button.style.width = (width * xScaling) + 'px';
  button.style.height = (height * xScaling) + 'px';

  //add a label on the bottom left corner of the button that says the type and index
  const label = document.createElement('label');
  // Increment the displayed index by 1 for user-friendly numbering (1-based instead of 0-based)
  label.textContent = type + ' ' + (parseInt(text) + 1);
  label.style.position = 'absolute';
  label.style.bottom = '0';
  label.style.left = '0';

  // Make label width wider for word elements to properly display both the type and the number
  if (type === 'word') {
    label.style.width = '30%'; // Wider for word elements
  } else {
    label.style.width = '10%';
  }

  label.style.height = '15px';
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

  if (type == 'element') {
    button.style.backgroundColor = 'rgba(128, 0, 128, 0.2)'; // Purple for elements
    button.style.border = '1px solid purple';
    label.style.backgroundColor = 'purple';
    label.style.color = 'white';
    defaultClass = 'selectElement';
    
    // Debug each element button as it's created
    console.log(`Creating element button: ID=${id}, X=${x}, Y=${y}, Width=${width}, Height=${height}, Class=${defaultClass}`);
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

//function to draw a rectangle on the canvas at a particular location
function drawRect(canvas, x, y, width, height, type, index, subIndex) {
  const ctx = canvas.getContext('2d');

  if (type === 'phoneme') {
    ctx.strokeStyle = 'red';
  } else if (type === 'glyph') {
    ctx.strokeStyle = 'yellow';
  } else {
    ctx.strokeStyle = '#000'; // fallback or other types
  }

  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, height);

  // Add a class to the canvas to mark it for preservation
  $(canvas).addClass('preserve-canvas');

  //draw a rectangle at the x, y, width, and height
  //if type is line, set transparent light green background and child label to be light green non-transparent and a green border
  if (type == 'line') {
    ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
    ctx.strokeStyle = 'green';
    ctx.lineWidth = 1;
  }
  if (type == 'word') {
    ctx.fillStyle = 'rgba(0, 0, 255, 0.2)';
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 1;
  }
  if (type == 'phoneme') {
    ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 1;
  }
  if (type == 'glyph') {
    ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
    ctx.strokeStyle = 'yellow';
    ctx.lineWidth = 1;
  }
  if (type == 'element') {
    ctx.fillStyle = 'rgba(128, 0, 128, 0.2)';
    ctx.strokeStyle = 'purple';
    ctx.lineWidth = 1;
  }
  
  ctx.fillRect(x, y, width, height);
  ctx.strokeRect(x, y, width, height);
}

// Add this function at the end of the file for additional debugging
function debugCollapsibleElements() {
  console.group('Collapsible Elements Debug');
  
  // Check for duplicate IDs
  const idMap = {};
  $('.file-tree [id]').each(function() {
    const id = $(this).attr('id');
    if (!idMap[id]) {
      idMap[id] = [];
    }
    idMap[id].push(this);
  });
  
  let duplicateCount = 0;
  for (const id in idMap) {
    if (idMap[id].length > 1) {
      console.warn(`Duplicate ID found: ${id}`, idMap[id]);
      duplicateCount++;
    }
  }
  console.log(`Found ${duplicateCount} duplicate IDs`);
  
  // Check href and aria-controls consistency
  $('.file-tree [data-bs-toggle="collapse"]').each(function() {
    const href = $(this).attr('href');
    const ariaControls = $(this).attr('aria-controls');
    
    if (href && !href.startsWith('#')) {
      console.warn('Invalid href attribute (missing #):', href, this);
    }
    
    if (href && href.substring(1) !== ariaControls) {
      console.warn('href and aria-controls mismatch:', {
        href: href,
        ariaControls: ariaControls,
        element: this
      });
    }
  });
  
  console.groupEnd();
}

/**
 * Initialize sidebar resize functionality - basic version without saving preference
 */
function initSidebarResize() {
  const $sidebar = $('#sidebar');
  const $handle = $('#sidebar-resize-handle');
  
  let isResizing = false;
  let startX, startWidth;
  
  $handle.on('mousedown', function(e) {
    isResizing = true;
    startX = e.clientX;
    startWidth = $sidebar.width();
    
    // Add visual feedback during resizing
    $handle.addClass('dragging');
    
    // Add body class to prevent text selection during resize
    $('body').addClass('sidebar-resizing');
    
    e.preventDefault();
  });
  
  $(document).on('mousemove.sidebarResize', function(e) {
    if (!isResizing) return;
    
    // Calculate new width based on mouse movement
    const newWidth = startWidth + (e.clientX - startX);
    
    // Apply min/max constraints
    const minWidth = parseInt($sidebar.css('min-width')) || 180;
    const maxWidth = parseInt($sidebar.css('max-width')) || 500;
    const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    
    // Set the new width
    $sidebar.width(constrainedWidth);
    
    // Update thumbnail sizes if we're in page selection tab
    updatePageThumbnails();
  });
  
  $(document).on('mouseup.sidebarResize', function() {
    if (isResizing) {
      isResizing = false;
      $handle.removeClass('dragging');
      
      // Remove body class
      $('body').removeClass('sidebar-resizing');
      
      // Final update to thumbnails
      updatePageThumbnails();
    }
  });
  
  // Function to update page thumbnails
  function updatePageThumbnails() {
    const sidebarWidth = $sidebar.width();
    
    // Adjust thumbnail heights based on width to maintain aspect ratio
    // This creates a more balanced view as the sidebar changes width
    const thumbnailHeight = Math.max(100, Math.min(200, sidebarWidth * 0.6));
    
    $('.pagesel img').css({
      'max-height': thumbnailHeight + 'px'
    });
    
    // Also adjust page info text size for better readability
    if (sidebarWidth < 220) {
      $('.page-info .title-text').css('font-size', '0.7rem');
    } else {
      $('.page-info .title-text').css('font-size', '');
    }
  }
  
  // Initialize thumbnail sizes
  updatePageThumbnails();
}

/**
 * Parse jsTree node ID to extract type and path
 * @param {string} nodeId - The jsTree node ID (e.g., "page-0-line-0-word-0")
 * @returns {object|null} - Parsed data with nodeType and path, or null if invalid
 */
function parseNodeId(nodeId) {
  const parts = nodeId.split('-');
  if (parts.length < 2 || parts.length % 2 !== 0) {
    console.error('Invalid node ID format:', nodeId);
    return null;
  }
  
  const nodeType = parts[0];
  const path = [];
  
  for (let i = 1; i < parts.length; i += 2) {
    const index = parseInt(parts[i], 10);
    if (isNaN(index)) {
      console.error('Invalid path index in node ID:', nodeId);
      return null;
    }
    path.push(index);
  }
  
  return { nodeType, path };
}