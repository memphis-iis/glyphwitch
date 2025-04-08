import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

// Publication for a single document with its phonemes - used for detailed operations
Meteor.publish("documentWithPhonemes", function(documentId) {
    check(documentId, String);
    return [
        Documents.find({_id: documentId}),
        Phonemes.find()
    ];
});

// Separate publications for optimized data loading
Meteor.publish("allDocuments", function() {
    return Documents.find();
});

Meteor.publish("documentById", function(documentId) {
    check(documentId, String);
    return Documents.find({_id: documentId});
});

Meteor.publish("referencesForDocument", function(documentId) {
    check(documentId, String);
    return References.find({documentId: documentId});
});