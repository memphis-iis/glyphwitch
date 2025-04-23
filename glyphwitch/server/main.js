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

Meteor.methods({
  deleteDocumentItem: function(documentId, itemType, path) {
    // Check if user is logged in
    if (!this.userId) {
      throw new Meteor.Error('not-authorized', 'You must be logged in to delete items');
    }
    
    console.log(`Deleting ${itemType} at path ${path.join('.')} from document ${documentId}`);
    
    // Get the document
    const document = Documents.findOne({ _id: documentId });
    if (!document) {
      throw new Meteor.Error('not-found', 'Document not found');
    }
    
    // Make a copy of the document to modify
    let docCopy = { ...document };
    
    // Handle different item types
    switch (itemType) {
      case 'page':
        // Delete a page
        const pageIndex = path[0];
        if (!docCopy.pages || pageIndex >= docCopy.pages.length) {
          throw new Meteor.Error('not-found', 'Page not found');
        }
        
        // Store the page ID before deletion for cleanup
        const pageId = docCopy.pages[pageIndex].pageId;
        
        // Remove the page
        docCopy.pages.splice(pageIndex, 1);
        
        // Remove the page image from Files collection if it exists
        if (pageId) {
          Files.remove({ _id: pageId });
        }
        break;
        
      case 'line':
        // Delete a line
        const linePageIndex = path[0];
        const lineIndex = path[1];
        
        if (!docCopy.pages || linePageIndex >= docCopy.pages.length || 
            !docCopy.pages[linePageIndex].lines || lineIndex >= docCopy.pages[linePageIndex].lines.length) {
          throw new Meteor.Error('not-found', 'Line not found');
        }
        
        docCopy.pages[linePageIndex].lines.splice(lineIndex, 1);
        break;
        
      case 'word':
        // Delete a word
        const wordPageIndex = path[0];
        const wordLineIndex = path[1];
        const wordIndex = path[2];
        
        if (!docCopy.pages || wordPageIndex >= docCopy.pages.length ||
            !docCopy.pages[wordPageIndex].lines || wordLineIndex >= docCopy.pages[wordPageIndex].lines.length ||
            !docCopy.pages[wordPageIndex].lines[wordLineIndex].words || wordIndex >= docCopy.pages[wordPageIndex].lines[wordLineIndex].words.length) {
          throw new Meteor.Error('not-found', 'Word not found');
        }
        
        docCopy.pages[wordPageIndex].lines[wordLineIndex].words.splice(wordIndex, 1);
        break;
        
      case 'glyph':
        // Delete a glyph
        const glyphPageIndex = path[0];
        const glyphLineIndex = path[1];
        const glyphWordIndex = path[2];
        const glyphIndex = path[3];
        
        if (!docCopy.pages || glyphPageIndex >= docCopy.pages.length ||
            !docCopy.pages[glyphPageIndex].lines || glyphLineIndex >= docCopy.pages[glyphPageIndex].lines.length ||
            !docCopy.pages[glyphPageIndex].lines[glyphLineIndex].words || glyphWordIndex >= docCopy.pages[glyphPageIndex].lines[glyphLineIndex].words.length) {
          throw new Meteor.Error('not-found', 'Word not found');
        }
        
        const word = docCopy.pages[glyphPageIndex].lines[glyphLineIndex].words[glyphWordIndex];
        
        // Handle both possible property names (glyphs or glyph)
        if (word.glyphs && glyphIndex < word.glyphs.length) {
          word.glyphs.splice(glyphIndex, 1);
        } else if (word.glyph && glyphIndex < word.glyph.length) {
          word.glyph.splice(glyphIndex, 1);
        } else {
          throw new Meteor.Error('not-found', 'Glyph not found');
        }
        break;
        
      case 'phoneme':
        // Delete a phoneme
        const phonemePageIndex = path[0];
        const phonemeLineIndex = path[1];
        const phonemeWordIndex = path[2];
        const phonemeIndex = path[3];
        
        if (!docCopy.pages || phonemePageIndex >= docCopy.pages.length ||
            !docCopy.pages[phonemePageIndex].lines || phonemeLineIndex >= docCopy.pages[phonemePageIndex].lines.length ||
            !docCopy.pages[phonemePageIndex].lines[phonemeLineIndex].words || phonemeWordIndex >= docCopy.pages[phonemePageIndex].lines[phonemeLineIndex].words.length ||
            !docCopy.pages[phonemePageIndex].lines[phonemeLineIndex].words[phonemeWordIndex].phonemes || phonemeIndex >= docCopy.pages[phonemePageIndex].lines[phonemeLineIndex].words[phonemeWordIndex].phonemes.length) {
          throw new Meteor.Error('not-found', 'Phoneme not found');
        }
        
        docCopy.pages[phonemePageIndex].lines[phonemeLineIndex].words[phonemeWordIndex].phonemes.splice(phonemeIndex, 1);
        break;
        
      case 'element':
        // Delete an element
        const elementPageIndex = path[0];
        const elementLineIndex = path[1];
        const elementWordIndex = path[2];
        const elementGlyphIndex = path[3];
        const elementIndex = path[4];
        
        if (!docCopy.pages || elementPageIndex >= docCopy.pages.length ||
            !docCopy.pages[elementPageIndex].lines || elementLineIndex >= docCopy.pages[elementPageIndex].lines.length ||
            !docCopy.pages[elementPageIndex].lines[elementLineIndex].words || elementWordIndex >= docCopy.pages[elementPageIndex].lines[elementLineIndex].words.length) {
          throw new Meteor.Error('not-found', 'Word not found');
        }
        
        const elementWord = docCopy.pages[elementPageIndex].lines[elementLineIndex].words[elementWordIndex];
        
        // Handle both possible property names (glyphs or glyph)
        let glyph;
        if (elementWord.glyphs && elementGlyphIndex < elementWord.glyphs.length) {
          glyph = elementWord.glyphs[elementGlyphIndex];
        } else if (elementWord.glyph && elementGlyphIndex < elementWord.glyph.length) {
          glyph = elementWord.glyph[elementGlyphIndex];
        } else {
          throw new Meteor.Error('not-found', 'Glyph not found');
        }
        
        if (!glyph.elements || elementIndex >= glyph.elements.length) {
          throw new Meteor.Error('not-found', 'Element not found');
        }
        
        glyph.elements.splice(elementIndex, 1);
        break;
        
      default:
        throw new Meteor.Error('invalid-type', `Unknown item type: ${itemType}`);
    }
    
    // Update the document
    Documents.update({ _id: documentId }, { $set: docCopy });
    
    return {
      success: true,
      message: `${itemType} deleted successfully`,
      path: path
    };
  },
  
  // ...existing methods (if any)...
});
