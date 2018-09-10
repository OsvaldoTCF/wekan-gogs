const vorpal = require('vorpal')();

var w2g_actions;

const init_cli = function() {
    vorpal
        .command('list', 'List repositories')
        .option('-a, --active', 'List only active repositories')
        .action(w2g_actions.list);

    vorpal
        .command('deactivate <username> <repo>', 'Deactivate repository')
        .option('-p, --priority', 'Deactivate repo in priority board')
        .action(w2g_actions.deactivate);

    vorpal
        .command('activate <username> <repo>', 'Activate repository')
        .option('-p, --priority', 'Activate repo in priority board')
        .action(w2g_actions.activate);

    vorpal
        .command('sync issues <username> <repo> <page>', 'Sync repository issues (only run this after activate)')
        .action(w2g_actions.syncIssues);

    vorpal
        .command('sync repos [username]', 'Sync repository list')
        .action(w2g_actions.syncRepos);

    vorpal
        .delimiter('wekan-gogs:')
};

module.exports = function(_w2g) {
    w2g_actions = require('./cli_actions.js')(_w2g);
    init_cli();
    return vorpal;
}
