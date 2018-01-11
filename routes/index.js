var express = require('express');
var router = express.Router();

var knex = require('knex')({
   dialect: 'sqlite3',
   connection: {
      filename: 'board_data.sqlite3'
   },
   useNullAsDefault:true
});

var Bookshelf = require('bookshelf')(knex);

Bookshelf.plugin('pagination');

var User = Bookshelf.Model.extend({
   tableName: 'users'
});

var Message = Bookshelf.Model.extend({
   tableName: 'messages',
   hasTimestamps: true,
   user: function() {
      return this.belongsTo(User);
   }
});

var Like = Bookshelf.Model.extend({
    tableName: 'likes'
})

router.get('/', (req, res, next) => {
   if (req.session.login == null){
      res.redirect('/users');
   } else {
      res.redirect('/1');
   }
});

router.get('/like/:message_id/:origin_page', (req, res, next) => {
    //:pageはリダイレクト先の指定に必要
    if (req.session.login == null){
        res.redirect('/users');
        return;
    }
    new Like({user_id: req.session.login.id, message_id:req.params.message_id})
        .save().then((model) => {
        res.redirect('/'+req.params.origin_page);
    });
});

router.get('/:page', (req, res, next) => {
   if (req.session.login == null){
      res.redirect('/users');
      return;
   }
   var pg = req.params.page;
   pg *= 1;
   if (pg < 1){ pg = 1; }
   var data = {
      title: 'Not Founds',
       login: req.session.login
   };
   new Message().orderBy('created_at', 'DESC')
         .fetchPage({page:pg, pageSize:10, withRelated: ['user']})
         .then((collection) => {
             data.collection = collection.toArray();
             data.pagination = collection.pagination;
             new Like().where('user_id', '=', req.session.login.id)
                 .fetchAll().then((collection2) => {
                 data.userLikes = collection2.toArray();
                 res.render('index', data);
             }).catch((err) => {
                 res.status(500).json({error: true, data: {message: err.message}});
             });
         }).catch((err) => {
            res.status(500).json({error: true, data: {message: err.message}});
         });
});

router.post('/',(req, res, next) => {
var rec = {
   message: req.body.msg,
   user_id: req.session.login.id
 }
 new Message(rec).save().then((model) => {
   res.redirect('/');
 });
})

module.exports = router;
