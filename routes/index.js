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
    tableName: 'likes',
    message: function () {
        return this.belongsTo(Message);
    },
})

router.get('/', (req, res, next) => {
   if (req.session.login == null){
      res.redirect('/users');
   } else {
      res.redirect('/1');
   }
});

router.get('/like/:message_id', (req, res, next) => {
    if (req.session.login == null){
        res.redirect('/users');
        return;
    }
    new Like({user_id: req.session.login.id, message_id:req.params.message_id})
        .save().then((model) => {
        res.redirect(req.headers.referer); //遷移元URLにリダイレクト
    });
});

router.get('/dislike/:message_id', (req, res, next) => {
    if (req.session.login == null){
        res.redirect('/users');
        return;
    }
    new Like().where({user_id: req.session.login.id, message_id:req.params.message_id})
        .destroy().then((model) => {
        res.redirect(req.headers.referer); //遷移元URLにリダイレクト
    });
});

router.get('/delete/:message_id', (req, res, next) => {
    if (req.session.login == null){
        res.redirect('/users');
        return;
    }
    new Message().where({id:req.params.message_id, user_id: req.session.login.id})
        .destroy().then((model) => {
        res.redirect(req.headers.referer); //遷移元URLにリダイレクト
    });
});

//TODO Bookshelf(データベース関係) リファクタリング

router.get('/bookmarks', (req, res, next) => {
    if (req.session.login == null){
        res.redirect('/users');
        return;
    }
    var data = {
        title: 'Not Founds',
        login: req.session.login,
        collection: []
    };
    new Message().orderBy('created_at', 'DESC')
        .fetchAll({withRelated: ['user']})
        .then((messages) => {
            Like.where('user_id', req.session.login.id)
                .fetchAll().then((likes) => {
                // 各投稿がログインユーザにLikeされているかどうか調べる
                let messagesArray = messages.toArray();
                let likesArray = likes.toArray()
                for(let j in messagesArray) {
                    for (let i in likesArray) {
                        if (likesArray[i].attributes.message_id == messagesArray[j].attributes.id) {
                            messagesArray[j].attributes.liked = true;
                            data.collection.push(messagesArray[j]);
                            break;
                        }
                    }
                }
                data.activeIndex = 3; //選択されたタブを設定するため
                res.render('index', data);
            }).catch((err) => {
                res.status(500).json({error: true, data: {message: err.message}});
            });
        }).catch((err) => {
        res.status(500).json({error: true, data: {message: err.message}});
    });
});

router.get('/hot', (req, res, next) => {
    if (req.session.login == null){
        res.redirect('/users');
        return;
    }
    var data = {
        title: 'Not Founds',
        login: req.session.login,
        collection: []
    };
    new Message().orderBy('created_at', 'DESC')
        .fetchAll({withRelated: ['user']})
        .then((messages) => {
            Like.fetchAll().then((likes) => {
                // 各投稿がいずれかのユーザにLikeされているかどうか調べる
                let messagesArray = messages.toArray();
                let likesArray = likes.toArray();
                for(let j in messagesArray) {
                    for (let i in likesArray) {
                        if (likesArray[i].attributes.message_id == messagesArray[j].attributes.id) {
                            data.collection.push(messagesArray[j]);
                            break;
                        }
                    }
                }
                Like.where('user_id', req.session.login.id)
                    .fetchAll().then((collection2) => {
                    userLikes = collection2.toArray();
                    // 各投稿がログインユーザにLikeされているかどうか調べる
                    for(let j in data.collection) {
                        let liked = false;
                        for (let i in userLikes) {
                            if (userLikes[i].attributes.message_id == data.collection[j].attributes.id) {
                                liked = true;
                                break;
                            }
                        }
                        data.collection[j].attributes.liked = liked;
                    }
                    data.activeIndex = 2; //選択されたタブを設定するため
                    res.render('index', data);
                }).catch((err) => {
                    res.status(500).json({error: true, data: {message: err.message}});
                });
            }).catch((err) => {
                res.status(500).json({error: true, data: {message: err.message}});
            });
        }).catch((err) => {
        res.status(500).json({error: true, data: {message: err.message}});
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
                 let userLikes = collection2.toArray();
                 // 各投稿がログインユーザにLikeされているかどうか調べる
                 for(let j in data.collection) {
                     let liked = false;
                     for (let i in userLikes) {
                         if (userLikes[i].attributes.message_id == data.collection[j].attributes.id) {
                             liked = true;
                             break;
                         }
                     }
                     data.collection[j].attributes.liked = liked;
                 }
                 data.activeIndex = 1; //選択されたタブを設定するため
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
    title: req.body.title,
   message: req.body.msg,
   user_id: req.session.login.id
 }
 new Message(rec).save().then((model) => {
   res.redirect('/');
 });
})



module.exports = router;
