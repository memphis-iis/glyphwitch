import { Meteor } from 'meteor/meteor';
import { FilesCollection } from 'meteor/ostrio:files';
import { Accounts } from 'meteor/accounts-base';
import { fromBuffer } from 'pdf2pic';
import util from 'util';
import ssim from 'ssim.js';
import pdf2img from 'pdf-img-convert';
import request from 'request';
import promisify from 'util.promisify';
import jimp from 'jimp';
import sharp from 'sharp';




const fs = require('fs');
const path = require('path');




// Meteor collections for MongoDB database. 

// Define the collections for the MongoDB database. 

//set storagepath to the /glyphwitchAssets folder in the server root
const storagePath = '/glyphwitchAssets';


Documents = new Meteor.Collection("documents");
References = new Meteor.Collection("references");
Phonemes = new Meteor.Collection("phonemes");
Fonts = new Meteor.Collection("fonts");
Glyphs = new Meteor.Collection("glyphs");
Discussion = new Meteor.Collection("discussion");
Files = new FilesCollection({
    collectionName: 'files',
    storagePath: storagePath,
    allowClientCode: false, // Disallow remove files from Client
    onBeforeUpload(file) {
        // Allow upload files under 10MB, and only in image, pdf, text, and font formats
        if (file.size <= 209715200 && /pdf|jpg|png|jpeg|txt|otf|ttf|woff|woff2/i.test(file.extension)) {
            return true;
        } else {
            return 'Please upload image, pdf, text, or font file, with size equal or less than 10MB';
        }
    }
});


// Define methods for the collections. They must be exported to be used in the main server file.

Meteor.methods({
    //create a new user, set role to user. Must have a username, email, and password. 
    createNewUser( email, password ) {
        console.log("Creating new user (email: " + email + ")");
        let errors = [];

        // Validate email
        if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            console.log("Error: Email is not valid");
            errors.push("Email is not valid");
        }

        // Validate password
        if (!password || !password.match(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{6,}$/)) {
            console.log("Error: Password is not valid");
            errors.push("Password must be at least 6 characters long and contain at least one number, one uppercase letter, and one special character.");
        }

        // If there are errors, return the errors
        if (errors.length > 0) {
            //return an error by throwing an exception
            return errors;
        }

        // Create user
        Accounts.createUser({
            username: email,
            email: email,
            password: password
        });

        // Assign role to user
        Roles.addUsersToRoles(Meteor.users.findOne({ username: username }), 'user');
    },
    //set user role
    setUserRole: function(username, role) {
        console.log("Setting user role (username: " + username + ", role: " + role + ")");
        //get the user
        user = Meteor.users.findOne({ username: username });
        //set the role
        try {
            Roles.addUsersToRoles(user, role);
            return true;
        } catch (error) {
            console.log("Error: " + error);
            return error;
        }
    },
    //change username and password, or just the password. Must include the old username. The old username is optional. New password must be at least 6 characters, contain at least one number, one uppercase letter, and one special character.
    changeEmailPassword: function(oldEmail, newPassword, newEmail=False) {
    console.log("Changing email and password (oldEmail: " + oldEmail + ", newPassword: " + newPassword + ", newEmail: " + newEmail + ")");
    //get the current user
    user = Meteor.user();
    console.log(user);
    //if the new email is provided, change the email
    if (newEmail) {
        try {
            Accounts.addEmail(user._id, newEmail);
            Accounts.removeEmail(user._id, oldEmail);
        } catch (error) {
            console.log("Error: " + error);
            return error;
        }
    }
    //change the password
    try {
        Accounts.setPassword(user._id, newPassword);
        return true;
    } catch (error) {
        console.log("Error: " + error);
        return error;
    }
    },
    //delete user
    deleteUser: function(username) {
        console.log("Deleting user (username: " + username + ")");
        //get the user
        user = Meteor.users.findOne({ username: username });
        //delete the user
        try {
            Meteor.users.remove(user);
            return true;
        } catch (error) {
            console.log("Error: " + error);
            return error;
        }
    },
    //add an entry to the documents collection. Must include the file collection location, the title, and the author. and the user who added it.
    addDocument: function(file, title, author) {
        console.log("Adding document (file: " + file + ", title: " + title + ", author: " + author + ")");
        //get the file from image collection
        file = Files.findOne({ _id: file });
        filepath = file.path;
        pages = [] // Replace pdfToImages(file) with an empty array
        document = Documents.insert({
            file: file._id,
            title: title,
            author: author,
            pages: [],
            addedBy: Meteor.userId()
        });
        console.log("Document added: " + document + ". Populating pages.")
        convertPdfToImages(file, document);
    
    },
    //add a blank document with no pages. Must include the title and the author.
    addBlankDocument: function(title, author) {
        console.log("Adding blank document (title: " + title + ", author: " + author + ")");
        document = Documents.insert({
            title: title,
            author: author,
            pages: [],
            addedBy: Meteor.userId()
        });
        return document;
    },
    //remove an entry from the documents collection. Must include the document id.
    removeDocument: function(document) {
        console.log("Removing document (document: " + document + ")");
        Documents.remove(document);
    },
    //update an entry in the documents collection. Must include the document id, the file collection location, the title, and the author.
    updateDocument: function(document, file, title, author) {
        console.log("Updating document (document: " + document + ", file: " + file + ", title: " + title + ", author: " + author + ")");
        Documents.update(document, { $set: { file: file, title: title, author: author } });
    },
    //add page to a document. Must include the document id, the page number, and the user who added it.
    addPageToDocument: function(document, fileObjId, pageNumber, title){
        console.log("Adding page (document: " + document + ", fileObjId: " + fileObjId + ", pageNumber: " + pageNumber + ")");
        //get the link to the file
        file = Files.findOne({ _id: fileObjId }).link();
        page = {
            pageId: fileObjId,
            image: file,
            title: title,
            addedBy: Meteor.userId(),
            lines: []
        }
        //get the Document
        doc = Documents.findOne(document);
        //add the page to the document
        doc.pages.push(page);
        //update the document
        Documents.update(document, doc);
    },
    addPageToDocumentAfterIndex: function(document, fileObjId, pageNumber, title, index){
        console.log("Adding page (document: " + document + ", fileObjId: " + fileObjId + ", pageNumber: " + pageNumber + ")");
        //add 1 to the index to insert after the index
        index += 1;
        //get the link to the file
        file = Files.findOne({ _id: fileObjId }).link();
        page = {
            pageId: fileObjId,
            image: file,
            title: title,
            addedBy: Meteor.userId(),
            lines: []
        }
        //get the Document
        doc = Documents.findOne(document);
        //add the page to the document at index, push the rest of the pages back
        doc.pages.splice(index, 0, page);
        //update the document
    },
    //remove page from a document. Must include the document id, the page number, and the user who added it.
    removePageFromDocument: function(document, page) {
        console.log("Removing page (document: " + document + ", page: " + page + ")");
        Documents.update(document, { $pull: { pages: page, addedBy: Meteor.userId() } });
    },
    //modify entire Document. Must include the document id, the file collection location, the title, and the author.
    modifyDocument: function(document) {
        console.log("Modifying document (document: " + JSON.stringify(document) + ")");
        Documents.update(document._id, document);
    },
    //modify page in a document. Must include the document id, the page number, and the user who added it.
    modifyPageInDocument: function(document, page) {
        console.log("Modifying page (document: " + document + ", page: " + page + ")");
        Documents.update(document, { $set: { pages: page, addedBy: Meteor.userId() } });
    },
    //add line to a page. Must include the document id, the page number, x1, y1, width, height, and the user who added it.
    addLineToPage: function(document, page_number, x1, y1, width, height) {
        console.log("Adding line (document: " + document + ", page: " + page_number + ", x1: " + x1 + ", y1: " + y1 + ", width: " + width + ", height: " + height + ")");
        //get the Document
        var doc = Documents.findOne(document);
        //get the page's image
        var page = doc.pages[page_number];

        //push the line to the page
        doc.pages[page_number].lines.push({ x1: x1, y1: y1, width: width, height: height , words: [], reference: [], annotatedBy: Meteor.userId() });
        //update the document
        Documents.update(document, doc);
    },
    //remove line from a page. Must include the document id, the page number, the line number, and the user who added it.
    removeLineFromPage: function(document, page, line) {
        console.log("Removing line (document: " + document + ", page: " + page + ", line: " + line + ")");
        //get the Document
        var doc = Documents.findOne(document);
        //remove the line from the page
        doc.pages[page].lines.splice(line, 1);
        //update the document
        Documents.update(document, doc);
    },
    //add word to a line. Must include the document id, the page number, the line number, the x coordinate, the width, the word order number, the word, and the user who added it.
    addWordToLine: function(document, page, line, x, width, wordOrder=false, word=false) {
        console.log("Adding word (document: " + document + ", page: " + page + ", line: " + line + ", x: " + x + ", width: " + width + ", wordOrder: " + wordOrder + ", word: " + word + ")");
        //get the Document
        var doc = Documents.findOne(document);
        //push the word to the line
        doc.pages[page].lines[line].words.push({ x: x, width: width, wordOrder: wordOrder, word: word, phonemes: [], glyph: [], addedBy: Meteor.userId() });
        //update the document
        Documents.update(document, doc);
    },
    //remove word from a line. Must include the document id, the page number, the line number, the word order number, and the user who added it.
    removeWordFromLine: function(document, page, line, wordOrder) {
        console.log("Removing word (document: " + document + ", page: " + page + ", line: " + line + ", wordOrder: " + wordOrder + ")");
        //get the Document
        var doc = Documents.findOne(document);
        //remove the word from the line
        doc.pages[page].lines[line].words.splice(wordOrder, 1);
        //update the document
        Documents.update(document, doc);
    },
    //modify word in a line. Must include the document id, the page number, the line number, the word order number, the word, and the user who added it.
    modifyWordInLine: function(document, page, line, wordOrder, word) {
        console.log("Modifying word (document: " + document + ", page: " + page + ", line: " + line + ", wordOrder: " + wordOrder + ", word: " + word + ")");
        //get the Document
        var doc = Documents.findOne(document);
        //modify the word in the line
        doc.pages[page].lines[line].words[wordOrder].word = word;
        //update the document
        Documents.update(document, doc);
    },
    //add an entry to the references collection. Must include the user who added it, the document id, the page number, and the line number, the word order number, and the word, an empty phoneme array, and notes.
    addReference: function(document, page, line, word, phoneme, glyph, notes) {
        console.log("Adding reference (document: " + document + ", page: " + page + ", line: " + line + ", word: " + word + ", phoneme: " + phoneme + ", glyph: " + glyph + ", notes: " + notes + ")");
        //create a discussion 
        discussion = Discussion.insert({ comments: [] });
        refId = References.insert({
            document: document,
            page: page,
            line: line,
            word: word,
            phoneme: phoneme,
            glyph: glyph,
            notes: notes,
            discussion: discussion,
            addedBy: Meteor.userId()
        });
        //if glyph is set, we add the refId to the glyph
        if (glyph) {
            Glyphs.update(glyph, { $push: { references: refId } });
            return refId;
        }
        //if phoneme is set, we add the refId to the phoneme
        if (phoneme) {
            Phonemes.update(phoneme, { $push: { references: refId } });
            return refId;
        }
        //if word is set, we add the refId to the word given document, page, and line
        if (word) {
            doc = Documents.findOne(document);
            page = doc.pages[page];
            line = page.lines[line];
            word = line.words[word];
            word.references.push(refId);
            Documents.update(document, doc);
            return refId;
        }
        //if line is set, we add the refId to the line given document and page
        if (line) {
            doc = Documents.findOne(document);
            page = doc.pages[page];
            line = page.lines[line];
            line.references.push(refId);
            Documents.update(document, doc);
            return refId;
        }
        //if page is set, we add the refId to the page given document
        if (page) {
            doc = Documents.findOne(document);
            page = doc.pages[page];
            page.references.push(refId);
            Documents.update(document, doc);
            return refId;
        }
        //if document is set, we add the refId to the document
        if (document) {
            doc = Documents.findOne(document);
            doc.references.push(refId);
            Documents.update(document, doc);
            return refId;
        }
    },
    addCommentToDiscussion: function(discussion, comment) {
        console.log("Adding comment to discussion (discussion: " + discussion + ", comment: " + comment + ")");
        Discussion.update(discussion, { $push: { comments: { text: comment, addedBy: Meteor.userId() } } });
    },
    //add discussion to document, page, line, word, phoneme, or glyph. Must include the discussion id, and the document, page, line, word, phoneme, or glyph id.
    //detects which collection the discussion is being added to and adds the discussion id to that collection.
    /// documents are hierarchical, so if a discussion is added to a word, we still need it's document, page, and line
    addDiscussion: function(discussion, document=False, page=False, line=False, word=False, phoneme=False, glyph=False) {
        console.log("Adding discussion (discussion: " + discussion + ", document: " + document + ", page: " + page + ", line: " + line + ", word: " + word + ", phoneme: " + phoneme + ", glyph: " + glyph + ")");
        //if the discussion is added to the glyph, add the discussion id to the glyph
        doc = Documents.findOne(document);
        discussionId = Discussion.insert({ comments: [] });
        added = False;
        if (glyph) {
            //if a discussion is already in the glyph, do nothing
            if (Glyphs.findOne(glyph).discussion && doc[page][line][word].glyphs[glyph].discussion) {
                return "Discussion already exists";
            }
            Glyphs.update(glyph, { $push: { discussion: discussion } });
            doc[page][line][word].glyphs[glyph].discussion = discussion;
            added = True;
        }
        //if the discussion is added to the phoneme inside the document, page, line, and word, add the discussion id to the phoneme
        if(phoneme && !added){
            //if a discussion is already in the phoneme, do nothing
            if (Phonemes.findOne(phoneme).discussion && doc[page][line][word].phonemes[phoneme].discussion) {
                return "Discussion already exists";
            }
            Phonemes.update(phoneme, { $push: { discussion: discussion } });
            doc[page][line][word].phonemes[phoneme].discussion = discussion;
            added = True;
        }
        //if the discussion is added to the word inside the document, page, and line, add the discussion id to the word
        if(word && !added){
            //if a discussion is already in the word, do nothing
            if (doc[page][line][word].discussion) {
                return "Discussion already exists";
            }
            doc[page][line][word].discussion = discussion;
            added = True;
        }
        //if the discussion is added to the line inside the document and page, add the discussion id to the line
        if(line && !added){
            //if a discussion is already in the line, do nothing
            if (doc[page][line].discussion) {
                return "Discussion already exists";
            }
            doc[page][line].discussion = discussion;
            added = True;
        }
        //if the discussion is added to the page inside the document, add the discussion id to the page
        if(page && !added){
            //if a discussion is already
            if (doc[page].discussion) {
                return "Discussion already exists";
            }
            doc[page].discussion = discussion;
            added = True;
        }
        //if the discussion is added to the document, add the discussion id to the document
        if(document && !added){
            //if a discussion is already in the document, do nothing
            if (doc.discussion) {
                return "Discussion already exists";
            }
            doc.discussion = discussion;
            added = True;
        }
        Documents.update(document, doc);
    },
    //remove an entry from the references collection. Must include the reference id.
    removeReference: function(reference) {
        console.log("Removing reference (reference: " + reference + ")");
        References.remove(reference);
    },
    //update an entry in the references collection. Must include the reference id, the document id, the page number, the line number, the word order number, the word, and the notes.
    updateReference: function(reference, document, page, line, wordOrder, word, notes) {
        console.log("Updating reference (reference: " + reference + ", document: " + document + ", page: " + page + ", line: " + line + ", wordOrder: " + wordOrder + ", word: " + word + ", notes: " + notes + ")");
        References.update(reference, { $set: { document: document, page: page, line: line, wordOrder: wordOrder, word: word, notes: notes } });
    },
    //add a phoneme to a reference, must include the reference id, the phoneme id, and the user who added it.
    addPhonemeToReference: function(reference, phoneme) {
        console.log("Adding phoneme (reference: " + reference + ", phoneme: " + phoneme + ")");
        References.update(reference, { $push: { phonemes: phoneme, addedBy: Meteor.userId() } });
    },
    //remove a phoneme from a reference, must include the reference id, the phoneme id, and the user who added it.
    removePhonemeFromReference: function(reference, phoneme) {
        console.log("Removing phoneme (reference: " + reference + ", phoneme: " + phoneme + ")");
        References.update(reference, { $pull: { phonemes: phoneme, addedBy: Meteor.userId() } });
    },
    //add an entry to the phonemes collection. Must include the phoneme, the user who added it, an empty glyph array, an ipa pronunciation
    addPhoneme: function(phoneme, ipa) {
        console.log("Adding phoneme (phoneme: " + phoneme + ", ipa: " + ipa + ")");
        Phonemes.insert({
            phoneme: phoneme,
            ipa: ipa,
            addedBy: Meteor.userId()
        });
    },
    addPhonemeToWord: function(document, page, line, word, x, width, ipa) {
        console.log("Adding phoneme to word (document: " + document + ", page: " + page + ", line: " + line + ", word: " + word + ", x: " + x + ", width: " + width + ", ipa: " + ipa + ")");
        //create the phoneme in the Phoneme collection
        phonemeId = Phonemes.insert({
            ipa: ipa,
            addedBy: Meteor.userId(),
            references: []
        });
        //get the word's id
        doc = Documents.findOne({ _id: document });
        page = doc.pages[page];
        line = page.lines[line];
        word = line.words[word];
        //add the phoneme to the word, if phonemes is an array, push the phoneme id, otherwise set the phoneme id
        if (word.phonemes) {
            word.phonemes.push({ phoneme: phonemeId, x: x, width: width, ipa: ipa });
        } else {
            word.phonemes = [{ phoneme: phonemeId, x: x, width: width, ipa: ipa }];
        }
        //update the word
        Documents.update(document, doc);
        return true;
    },
    //remove an entry from the phonemes collection. Must include the phoneme id.
    removePhoneme: function(phoneme) {
        console.log("Removing phoneme (phoneme: " + phoneme + ")");
        Phonemes.remove(phoneme);
    },
    //update an entry in the phonemes collection. Must include the phoneme id, the phoneme, the ipa pronunciation, and the user who added it.
    updatePhoneme: function(phoneme, phoneme, ipa) {
        console.log("Updating phoneme (phoneme: " + phoneme + ", ipa: " + ipa + ")");
        Phonemes.update(phoneme, { $set: { phoneme: phoneme, ipa: ipa } });
    },
    //add a glyph to a phoneme. Must include the phoneme id, the glyph id, and the user who added it.
    addGlyphToPhoneme: function(phoneme, glyph) {
        console.log("Adding glyph (phoneme: " + phoneme + ", glyph: " + glyph + ")");
        Phonemes.update(phoneme, { $push: { glyphs: glyph, addedBy: Meteor.userId() } });
    },
    addGlyphToWord: function(document, page, line, word, x, width, documentImageData, drawnImageData) {
        console.log("Adding glyph to word (document: " + document + ", page: " + page + ", line: " + line + ", word: " + word + ", x: " + x + ", width: " + width + ", documentImageData: " + documentImageData + ", drawnImageData: " + drawnImageData + ")");
        //create the glyph in the Glyphs collection
        glyphId = Glyphs.insert({
            documentImageData: documentImageData,
            drawnImageData: drawnImageData,
            addedBy: Meteor.userId(),
            references: []
        });
        //get the word's id
        doc = Documents.findOne({ _id: document });
        page = doc.pages[page];
        line = page.lines[line];
        word = line.words[word];
        //add the glyph to the word, if glyphs is an array, push the glyph id, otherwise set the glyph id
        if (word.glyphs) {
            word.glyphs.push({ glyph: glyphId, x: x, width: width });
        } else {
            word.glyphs = [{ glyph: glyphId, x: x, width: width }];
        }
        //update the word
        Documents.update(document, doc);
        return true;
    },

    //remove a glyph from a phoneme. Must include the phoneme id, the glyph id, and the user who added it.
    removeGlyphFromPhoneme: function(phoneme, glyph) {
        console.log("Removing glyph (phoneme: " + phoneme + ", glyph: " + glyph + ")");
        Phonemes.update(phoneme, { $pull: { glyphs: glyph, addedBy: Meteor.userId() } });
    },
    //add an entry to the glyphs collection. Must include the glyph, the user who added it, it may contain a font id, a unicode value for that font, an image, and the user who added it.
    addGlyph: function(glyph, font=False, unicode=False, documentImageData, drawnImageData){
        console.log("Adding glyph (glyph: " + glyph + ", font: " + font + ", unicode: " + unicode + ", image: " + image + ")");
        //if font or unicode or image is not provided, return an error
        if ((!font && !unicode) || (!documentImageData && !drawnImageData)) {
            console.log("Error: Glyph must have a font and unicode or image data.");
            return;
        }
        Glyphs.insert({
            glyph: glyph,
            font: font,
            unicode: unicode,
            documentImageData: documentImageData,
            drawnImageData: drawnImageData,
            references: [],
            addedBy: Meteor.userId()
        });
    },
    //add glyph using canvas data
    addGlyphFromDataURL: function(dataURL, font="", unicode=0) {
        console.log("Adding glyph from dataURL (dataURL: " + dataURL + ")");
        bufferedImage = new Buffer(dataURL.replace(/^data:image\/\w+;base64,/, ""), 'base64');

        Files.write(bufferedImage, { fileName: 'glyph.png', type: 'image/png' }, function (err, fileObj) {
            if (err) {
                console.log("Error: " + err);
            } else {
                console.log("File added: " + fileObj._id);
                link = Files.findOne(fileObj._id).link();
                Glyphs.insert({
                    glyph: "glyph",
                    font: "",
                    unicode: "",
                    image: fileObj._id,
                    image_link: link,

                });
            }
        });
    },
    //add glyph from buffer
    addGlyphFromBuffer: function(buffer, font, unicode) {
        console.log("Adding glyph from buffer (buffer: " + buffer + ", font: " + font + ", unicode: " + unicode + ")");
        Files.write(buffer, { fileName: 'glyph.png', type: 'image/png' }, function (err, fileObj) {
            if (err) {
                console.log("Error: " + err);
            } else {
                console.log("File added: " + fileObj._id);
                link = Files.findOne(fileObj._id).link();
                Glyphs.insert({
                    glyph: "glyph",
                    font: font,
                    unicode: unicode,
                    image: fileObj._id,
                    image_link: link,
                });
            }
        });
    },

    compareImageGlyphs: function(glyph1, glyph2) {
        console.log("Comparing image glyphs (glyph1: " + glyph1 + ", glyph2: " + glyph2 + ")");
       
    },
    findNearbyGlyphsFromDataURL: async function(dataURL, numGlyphs) {
        console.log("Finding nearby glyphs from dataURL... (dataURL: " + dataURL + ", numGlyphs: " + numGlyphs + ")");
      
              
        // Decode dataURL efficiently
        bufferedImage = new Buffer.from(dataURL.replace(/^data:image\/\w+;base64,/, ""), 'base64');
      
        //convert the buffer to Uint8ClampedArray
        const searchImage = {
            data: new Uint8ClampedArray(bufferedImage),
            width: 20,
            height: 20
        }

        console.log("Search image data: " + searchImage.data);
        //open with opencv
        const searchImageMat = new cv.Mat(searchImage.height, searchImage.width, cv.CV_8UC4);
        console.log("Search image mat: " + searchImageMat);
        searchImageMat.data = searchImage.data;
        //blur the image
        const ksize = new cv.Size(5, 5);
        const searchImageBlurred = searchImageMat.gaussianBlur(ksize, 5, 5, borderType=cv.BORDER_DEFAULT);
        const searchImageGrayscale = searchImageBlurred.cvtColor(cv.COLOR_RGBA2GRAY);
        console.log("Search image grayscale: " + searchImageGrayscale);
        //output as buffer
        const buffer = searchImageGrayscale.getData();
        console.log("Search image buffer: " + buffer);
        const hog = new cv.HOGDescriptor();
        console.log("HOG: " + hog);
        //compute HOG features
        const searchImageHOG = hog.compute(searchImageGrayscale);


        //iterate over all the glyphs, see if they have an imageData field containing a Uint8ClampedArray of the image data, otherwise download it from the image_link
        for (glyph of glyphs) {
            console.log("Processing glyph (glyph: " + glyph._id + ")");
            if (!glyph.imageData || !glyph.imageDataBlurred) {
                const glyphImagePath = Files.findOne(glyph.image).path;
                console.log("Glyph image path: " + glyphImagePath);
                try{
                    const image = cv.imread(glyphImagePath);
                    const imageGrayscale = image.cvtColor(cv.COLOR_RGBA2GRAY);
                    const glyphImageData = imageGrayscale.getData();
                    //create a copy that blurs the image
                    const imageBlurred = greyImage.blur(5);
                    const glyphImageDataBlurred = imageBlurred.getData();
                    glyph.imageData = glyphImageData;
                    glyph.imageDataBlurred = glyphImageDataBlurred;
                    console.log("Image data for glyph (glyph: " + glyph._id + ") added.");
                } catch (error) {
                    console.log("Error preprocessing image data for glyph (glyph: " + glyph._id + "): " + error);
                }
            }
            if (!glyph.HOGfeatures || !glyph.HOGfeaturesBlurred) {
                try{
                    //read the imgData into a cv.Mat
                    const glyphMat = cv.matFromArray(Float32Array.from(glyph.imageData));
                    const glyphMatBlurred = cv.matFromArray(Float32Array.from(glyph.imageDataBlurred));
                    const hogFeatures = hog.compute(glyphMat);
                    const hogFeaturesBlurred = hog.compute(glpyhMatBlurred);
                    glyph.HOGfeatures = hogFeatures;
                    glyph.HOGfeaturesBlurred = hogFeaturesBlurred;
                    console.log("HOG features for glyph (glyph: " + glyph._id + ") added.");
                } catch (error) {
                    console.log("Error computing HOG feature for glyph (glyph: " + glyph._id + "): " + error);
                }
            }
            Glyphs.upsert(glyph);

            matches = [];
            
            //iterate over all the glyphs and compare the search image to each glyph
            feature1Mat = cv.matFromArray(Float32Array.from(searchImageHOG));
            feature2Mat = cv.matFromArray(Float32Array.from(glyph.hogFeaturesBlurred));
            const chi_square = feature1Mat.chiSquare(feature2Mat, cv.HISTCMP_CHISQR);
            

            //add the chi square value to the matches array
            console.log("glyph: " + glyph._id + ", chi_square: " + chi_square);
            matches.push({ glyph: glyph._id, chi_square: chi_square });

        }

        //sort the matches array by chi square value
        matches.sort(function(a, b) {
            return a.chi_square - b.chi_square;
        });

        //return the top numGlyphs matches
        return matches.slice(0, numGlyphs);


    },
    //remove an entry from the glyphs collection. Must include the glyph id.
    removeGlyph: function(glyph) {
        console.log("Removing glyph (glyph: " + glyph + ")");
        Glyphs.remove({ _id: glyph })
    },
    //update an entry in the glyphs collection. Must include the glyph id, the glyph, the font, the unicode, and the image.
    updateGlyph: function(glyph, glyph, font, unicode, image) {
        console.log("Updating glyph (glyph: " + glyph + ", font: " + font + ", unicode: " + unicode + ", image: " + image + ")");
        Glyphs.update(glyph, { $set: { glyph: glyph, font: font, unicode: unicode, image: image } });
    },
    //add an entry to the fonts collection. Must include the font, the user who added it, and it's file collection id
    addFont: function(file) {
        file = Files.findOne({ _id: file });
        //iterate over all the glyphs in the font and generate images for them
        const font = file.path;
        const glyphs = [];
        //we have to iterate over all the possible unicode values for a font
        for (let i = 0; i < 100; i++) {
            console.log("Adding glyph: " + i + " to font: " + file._id);
            const fileName = "glyph_" + file._id + "_" + i + ".png";
            createGlyphImage(font, i)
        }
    },
    //remove an entry from the fonts collection. Must include the font id.
    removeFont: function(font) {
        console.log("Removing font (font: " + font + ")");
        Fonts.remove(font);
    },
    //remove a file from the files collection. Must include the file id.
    removeFile: function(file) {
        console.log("Removing file (file: " + file + ")");
        Files.remove(file);
    },
    //get reference by document, page, line, and word order. Everything but the document is optional.
    findReferences: function(document, page=False, line=False, wordOrder=False) {
        console.log("Finding references (document: " + document + ", page: " + page + ", line: " + line + ", wordOrder: " + wordOrder + ")");
        //if only the document is provided, return all references for that document
        if (page == False && line == False && wordOrder == False) {
            return References.find({ document: document });
        }
        //if the document and page are provided, return all references for that page
        else if (line == False && wordOrder == False) {
            return References.find({ document: document, page: page });
        }
        //if the document, page, and line are provided, return all references for that line
        else if (wordOrder == False) {
            return References.find({ document: document, page: page, line: line });
        }
        //if the document, page, line, and word order are provided, return all references for that word
        else {
            return References.find({ document: document, page: page, line: line, wordOrder: wordOrder });
        }
    },
    //create a new discussion on a reference. Must include the reference id, the user who added it, and the text of the first comment.
    addDiscussion: function(reference, comment) {
        console.log("Adding discussion (reference: " + reference + ", comment: " + comment + ")");
        Discussion.insert({
            reference: reference,
            comments: [{ text: comment, addedBy: Meteor.userId() }]
        });
    },
    getDiscussion: function(reference) {
        console.log("Getting discussion (reference: " + reference + ")");
        return Discussion.findOne({reference: reference});
    }
});

//Define Publications for the collections. They must be exported to be used in the main server file. 
//All collections are published to the client.
Meteor.publish("all", function() {
    return [
        Documents.find(),
        References.find(),
        Phonemes.find(),
        Fonts.find(),
        Glyphs.find(),
        Discussion.find()
    ];
});
//User data is also published to the client.
Meteor.publish("userData", function () {
    return Meteor.users.find();
});

//image publication
Meteor.publish('files.images.all', function () {
    return Files.find().cursor;
  });


//Utility Functions

//Function to open a local pdf file and convert it to images, then add the images to the image collection. Returns the images as an array of image ids.
async function convertPdfToImages(pdfinfo, documentId) {
    console.log("PDF Path: " + pdfinfo.fetch()[0].path, "Document ID: " + documentId);
    //read the pdf file
    const pdfPath = pdfinfo.fetch()[0].path;
    const pdfPageCounter = require('pdf-page-counter');
    const pdfConversionConfig = {
        width: 4096,
    };
    //get the number of pages in the pdf
    outputImages = pdf2img.convert(pdfPath, pdfConversionConfig, function(err, info) {
        if (err) {
            console.log("Error: " + err);
        } else {
            console.log("Info: " + info);
        }
    });
    outputImages.then(function(images) {
        console.log("Images: " + images);
        //add the images to the image collection
        for (image of images) {
            Files.write(image, { fileName: 'page' + images.indexOf(image) + '.png', type: 'image/png' }, function (err, fileObj) {
                if (err) {
                    console.log("Error: " + err);
                } else {
                    console.log("File added: " + fileObj._id);
                    link = Files.findOne(fileObj._id).link();
                    Documents.update(documentId, { $push: { pages: {pageId: fileObj._id, image: link, lines: []} } });
                }
            });
        }
    });
}


//specialty functions for the glyphwitch application
function blurImage(imageData, kernelSize) {
    const width = imageData.width;
    const height = imageData.height;
    const newImageData = new Uint8ClampedArray(width * height);
  
    // Iterate through each pixel (excluding edges for proper blurring)
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let sum = 0;
        let count = 0;
  
        // Apply kernel around the center pixel
        for (let ky = -kernelSize; ky <= kernelSize; ky++) {
          for (let kx = -kernelSize; kx <= kernelSize; kx++) {
            const neighborX = x + kx;
            const neighborY = y + ky;
  
            // Check if neighbor pixel is within image bounds
            if (neighborX >= 0 && neighborX < width && neighborY >= 0 && neighborY < height) {
              const neighborIndex = neighborY * width + neighborX;
              sum += imageData[neighborIndex];
              count++;
            }
          }
        }
  
        // Set new pixel value as the average of neighbors
        const newIndex = y * width + x;
        newImageData[newIndex] = Math.floor(sum / count);
      }
    }
  
    // Copy edge pixels directly (no blurring for these)
    for (let y = 0; y < height; y++) {
      newImageData[y * width] = imageData[y * width]; // Top row
      newImageData[(y + 1) * width - 1] = imageData[(y + 1) * width - 1]; // Bottom row
    }
    for (let x = 0; x < width; x++) {
      newImageData[x] = imageData[x]; // Left column
      newImageData[height * width - x - 1] = imageData[height * width - x - 1]; // Right column
    }
  
    return newImageData;
  }



  function createGlyphImage(fontPath, charCode) {
    const fontFileName = fontPath.split('/').pop();
    const opentype  = require('opentype.js');
    const { createCanvas } = require('canvas');
    const canvas = createCanvas(20, 20);
    const ctx = canvas.getContext('2d');
    const buffers = {};
    const font = opentype.loadSync(fontPath, (err, font) => {
        if (err) {
            console.log("Error: " + err);
            return;
        }
    });
    //print the character
    console.log("Glyph: " + String.fromCharCode(charCode));
    if (font.charToGlyph(String.fromCharCode(charCode)) == "") {
        console.log("Error: Glyph not found in font");
        return;
    }
    font.draw(ctx, String.fromCharCode(charCode), 3, 18, 20);
    //if the image is pure white, return
    if (ctx.getImageData(0, 0, 20, 20).data.every((val, i, arr) => val === arr[0])) {
        console.log("Error: Glyph is blank");
        return;
    }
    newBuffer = canvas.toDataURL();
    //add the image to the image collection
    Meteor.call('addGlyphFromDataURL', newBuffer, fontFileName, charCode);
  }