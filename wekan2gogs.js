var sqlite3 = require('sqlite3');

var w2g = {
    url: null,
    prioBoardId: null,
    prioBacklogListId: null,
    wekanc: null,
    gogsc: null,
    db: null,
    wekan: {
        setupPrioBoard: function(cb) {
            w2g.prioBoardExists(w2g.wekanc.adminId, function(err, row) {
                if (err) {
                    if (cb) cb(err);
                } else if (!row || !row.prioBoardId) {
                    // Create board
                    w2g.wekanc.Boards.create('Priority', function(err, boardId) {
                        if (err != null) {
                            console.log('Error creating priority board!');
                            return;
                        } else {
                            // Create list
                            w2g.wekanc.Lists.create('To Do', boardId,
                                function(err, listId) {
                                    if (err != null) {
                                        console.log('Error creating To Do list!');
                                        // TODO: Delete board created?
                                    } else {
                                        w2g.prioBoardId = boardId;
                                        w2g.prioBacklogListId = listId;
                                        w2g.insertPrioBoard(w2g.wekanc.adminId,
                                            boardId, listId);
                                    }
                                });
                        }
                    });
                } else if (!row.prioBacklogListId) {
                    // Create list
                    w2g.wekanc.Lists.create('To Do', row.prioBoardId,
                        function(err, listId) {
                            if (err != null) {
                                console.log('Error creating To Do list!');
                                if (cb) cb('Error creating To Do list!');
                            } else {
                                w2g.prioBoardId = row.prioBoardId;
                                w2g.prioBacklogListId = listId;
                                w2g.updatePrioBoard(w2g.wekanc.adminId,
                                    row.prioBoardId, listId);
                            }
                        });
                } else {
                    // Just save the reference
                    w2g.prioBoardId = row.prioBoardId;
                    w2g.prioBacklogListId = row.prioBacklogListId;
                }
            });
        }
    },
    gogs: {
        parseHookPrio: function(body) {
            if (body.issue && body.action === 'label_updated') {
                w2g.gogs.label(body);
            }
        },
        parseHook: function(body) {
            if (body.issue) {
                w2g.gogs.issue(body);
            }
        },
        label: function(body) {
            var issue = body.issue;
            var has_prio = false;
            issue.labels.forEach(function(el){
                if (el.name === 'kan:priority') {
                    has_prio = true;
                }
            });
            w2g.getPrioCard(issue.id, function(err, card){
                if (err != null && has_prio) {
                    // Create card
                    var boardId = w2g.prioBoardId;
                    var listId = w2g.prioBacklogListId;
                    w2g.wekanc.Cards.create(issue.title,
                        issue.body,
                        boardId,
                        listId, function(err, cardId) {
                            if (err != null) {
                            } else {
                                //Insert issue
                                w2g.insertPrioIssue(issue.id,
                                    cardId,
                                    boardId,
                                    listId);
                            }
                        });
                } else if (err == null && !has_prio) {
                    console.log(card);
                    // Delete card
                    w2g.wekanc.Cards.delete(card.boardId,
                        card.listId,
                        card.cardId,
                        function(err, _id){
                            if (err != null) {
                                console.log('Error deleting card '+_id);
                            } else {
                                w2g.removePrioCard(issue.id);
                            }
                        });
                }
            });
        },
        issue: function(issue) {
            if (issue.action = 'opened') {
                console.log(issue);
                w2g.getRepo('repoId', issue.repository.id, function(err, repo){
                    if (err != null) {
                        // Create board
                        w2g.wekanc.Boards.create(issue.repository.full_name, function (err, boardId) {
                            if (err != null) {
                            } else {
                                // Insert repo
                                w2g.insertRepo(issue.repository.id, boardId);
                                // Create dummy list
                                w2g.wekanc.Lists.create('Backlog', boardId, function (err, listId) {
                                    if (err != null) {
                                    } else {
                                        // Create card
                                        w2g.wekanc.Cards.create(issue.issue.title,
                                            issue.issue.body,
                                            boardId, listId, function(err, cardId) {
                                                if (err != null) {
                                                } else {
                                                    //Insert issue
                                                    w2g.insertIssue(issue.issue.id,
                                                        cardId,
                                                        boardId,
                                                        listId);
                                                }
                                            });
                                    }
                                });
                            }
                        });
                    } else {
                        // Get lists
                        w2g.wekanc.Lists.get(repo.boardId, function(err, lists) {
                            if (err != null || lists.length === 0) {
                            } else {
                                var listId = lists[0]._id;
                                // Create card
                                w2g.wekanc.Cards.create(issue.issue.title,
                                    issue.issue.body,
                                    repo.boardId, listId, function(err, cardId) {
                                        if (err != null) {
                                        } else {
                                            //Insert issue
                                            w2g.insertIssue(issue.issue.id,
                                                cardId,
                                                repo.boardId,
                                                listId);
                                        }
                                    });
                            }
                        });
                    }
                });
            }
        }
    },
    deleteLabels: function(username, repoName) {
        w2g.getRepo('repoFullName', username+'/'+repoName, function(err, row) {
            if (!err) {
                w2g.db.all('SELECT * FROM labels WHERE repoId = ?',
                    row.repoId, function(err, labels) {
                        labels.forEach(function(label) {
                            w2g.gogsc.Labels.delete(username, repoName, label.id);
                            w2g.db.run('DELETE FROM labels WHERE id = ?', label.id);
                        });
                    });
            }
        });
    },
    prioBoardExists: function(user, cb) {
        w2g.db.get('SELECT * FROM boards_prio WHERE wekan_userid = ?',
            user, function(err, row) {
                if (err != null) {
                    if (cb) cb(err, null);
                } else {
                    if (cb) cb(null, row);
                }
            });
    },
    insertPrioBoard: function(userId, boardId, listId) {
        w2g.db.run('INSERT INTO boards_prio VALUES (?,?,?)',
            userId,
            boardId,
            listId);
    },
    updatePrioBoard: function(userId, boardId, listId) {
        w2g.db.run('UPDATE boards_prio SET prioBoardId = ?, \
                prioBacklogListId = ? WHERE wekan_userid = ?',
            boardId, listId, userId);
    },
    syncIssues: function(username, repoName) {
        const repoFullName = username+'/'+repoName;
        w2g.gogsc.Issues.getAll(username, repoName, function(err, issues) {
            if (!err) {
                w2g.getLabel('labelName', w2g.kanLabels.todo.name, function(err, label) {
                    if (!err) {
                        w2g.getRepo('repoFullName', repoFullName, function(err, row) {
                            if (!err) {
                                issues.forEach(function(issue) {
                                    w2g.gogsc.Labels.addIssueLabels(repoName, issue.number, [label.id]);
                                    w2g.wekanc.Cards.create(issue.title, issue.body, row.boardId, label.listId, function(err, cardId) {
                                        w2g.insertIssue(issue.id, repoFullName, issue.number, cardId, label.listId, row.boardId);
                                    });
                                });
                            } else {
                                console.log('Error getting repoId');
                            }
                        });
                    } else {
                        console.log('Error getting labelId');
                    }
                });
            } else {
                console.log('Error getting issues');
            }
        });
    },
    syncLabels: function(username, repoName) {
        w2g.gogsc.Labels.getAll(username, repoName, function(err, labels) {
            if (!err) {
                labels.forEach(function(el) {
                    w2g.getLabel('labelName', el.name, function(err, row) {
                        if (!err && row) {
                            w2g.updateLabel('labelName', el.name, 'id', el.id);
                        }
                    });
                });
            }
        });
    },
    insertIssue: function(issueId, repoFullName, issueIndex, cardId, boardId, listId) {
        w2g.db.run('INSERT INTO cards VALUES (?,?,?,?,?,?)',
            issueId,
            repoFullName,
            issueIndex,
            cardId,
            boardId,
            listId);
    },
    insertPrioIssue: function(issueId, repoFullName, issueIndex, cardId, boardId, listId) {
        w2g.db.run('INSERT INTO cards_prio VALUES (?,?,?,?,?,?)',
            issueId,
            repoFullName,
            issueIndex,
            cardId,
            boardId,
            listId);
    },
    removePrioCard: function(issueId) {
        w2g.db.run('DELETE FROM cards_prio WHERE issueId = ?',
            issueId);
    },
    insertRepo: function(repoId, repoFullName, boardId, backlogListId, active, active_prio, hookId, hook_prioId) {
        w2g.db.run('INSERT INTO repos VALUES (?,?,?,?,?,?,?,?)',
            repoId, repoFullName, boardId, backlogListId, active, active_prio, hookId, hook_prioId);
    },
    updateRepo: function(searchkey, searchvalue, updatekey, updatevalue) {
        w2g.db.run('UPDATE repos SET '+updatekey+' = ? WHERE '+searchkey+' = ?',
            updatevalue, searchvalue);
    },
    getPrioCard: function(issueId, cb) {
        w2g.db.get('SELECT * FROM cards_prio WHERE issueId = ?',
            issueId,
            function(err, row) {
                if (err == null && row != undefined) {
                    if (cb) cb(null, row);
                } else {
                    if (cb) cb(true);
                }
            });
    },
    getRepo: function(searchKey, searchValue, cb) {
        w2g.db.get('SELECT * FROM repos WHERE '+searchKey+' = ?',
            searchValue,
            function(err, row) {
                if (err == null && row != undefined) {
                    if (cb) cb(null, row);
                } else {
                    if (cb) cb(true);
                }
            });
    },
    saveGogsToken: function(token) {
        w2g.db.run('UPDATE auth SET gogs_token = ?', token);
    },
    getLabel: function(searchKey, searchValue, cb) {
        w2g.db.get('SELECT * FROM labels WHERE '+searchKey+' = ?',
            searchValue,
            function(err, row) {
                if (!err && row) {
                    if (cb) cb(null, row);
                } else {
                    if (cb) cb(true);
                }
            });
    },
    insertLabel: function(id, repoId, labelName, listId) {
        w2g.db.run('INSERT INTO labels VALUES (?,?,?,?)',
            id, repoId, labelName, listId);
    },
    updateLabel: function(searchKey, searchValue, updateKey, updateValue) {
        w2g.db.run('UPDATE labels SET '+updateKey+' = ? WHERE '+searchKey+' = ?',
            updateValue, searchValue);
    },
    kanLabels: {
        todo: {
            name: 'kan:To Do',
            color: '#c7def8'
        },
        priority: {
            name: 'kan:Priority',
            color: '#FE2E2E'
        },
        others: [
            {
                name: 'kan:In Progress',
                color: '#fca43f'
            },
            {
                name: 'kan:Review',
                color: '#bf3cfc'
            },
            {
                name: 'kan:Done',
                color: '#71d658'
            }
        ]
    }
};

module.exports = function(cb) {
    // Create or open DB
    w2g.db = new sqlite3.Database('gogsWekan.db',
        sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
        function(err) {
            if (err != null) {
                if (cb) cb('Error opening gogs database!');
            }
        });
    w2g.db.serialize(); //sticky

    var init = function(gurl, gusr, gpass, gtoken, wurl, wusr, wpass) {
        w2g.wekanc = require('./wekan_client.js')(wurl, wusr, wpass,
            function(err) {
                if (!err) {
                    w2g.wekan.setupPrioBoard(function(err) {/* TODO */});
                }
            });
        w2g.gogsc = require('./gogs_client.js')(gurl, gusr, gpass, gtoken);
        if (!w2g.wekanc) {
            if (cb) cb('Error initializing wekan client!');
        }
        if (!w2g.gogsc) {
            if (cb) cb('Error initializing gogs client!');
        }
        if (!gtoken) {
            w2g.gogsc.Users.createToken('Wekan2Gogs', function(err, token) {
                if (err) {
                    if (cb) cb('Error registering app with gogs!');
                }
                w2g.saveGogsToken(token);
            });
        }
        var cli = require('./cli.js')(w2g);
        cli.show();
    };

    // Get usr && pass from database, or prompt user input
    w2g.db.get('SELECT * FROM auth', function(err, row) {
        if (!err && row) {
            // Full info in database
            console.log('Found credentials in database!');
            w2g.url = row.w2g_url;
            init(row.gogs_url, row.gogs_username,
                row.gogs_password, row.gogs_token,
                row.wekan_url, row.wekan_username,
                row.wekan_password);
        } else {
            // Missing data, prompt user input
            var prompt = require('prompt');
            var schema = {
                properties: {
                    gogs_url: {
                        required: true
                    },
                    gogs_username: {
                        required: true
                    },
                    gogs_password: {
                        required: true,
                        hidden: true
                    },
                    wekan_url: {
                        required: true
                    },
                    wekan_username: {
                        required: true
                    },
                    wekan_password: {
                        required: true,
                        hidden: true
                    },
                    w2g_url: {
                        required: true
                    }
                }
            };
            prompt.start();
            prompt.get(schema, function (err, result) {
                if (err != null) {
                    if (cb) cb('Error reading credentials!');
                }
                w2g.db.run('INSERT INTO auth (gogs_url, gogs_username, \
                gogs_password, wekan_url, wekan_username, \
                wekan_password, w2g_url) VALUES \
                (?,?,?,?,?,?,?)', result.gogs_url,
                    result.gogs_username,
                    result.gogs_password,
                    result.wekan_url,
                    result.wekan_username,
                    result.wekan_password,
                    result.w2g_url);

                w2g.url = result.w2g_url;
                init(result.gogs_url,
                    result.gogs_username,
                    result.gogs_password,
                    null,
                    result.wekan_url,
                    result.wekan_username,
                    result.wekan_password);
            });
        }
    });

    return w2g;
};
