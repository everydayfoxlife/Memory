var WuiDom = require('wuidom');
var wuibuttonbehavior = require('wuibuttonbehavior');
var GameManager = require('./GameManager');
var constants = require('./constants');

var game = new GameManager();

var htmlElement = document.querySelector('#main');
var main = new WuiDom(htmlElement);

var clear = main.createChild('div', { className: 'clear' });
clear.createChild('h2', { className: 'clearHeader', text: 'All Clear' });
var reset = clear.createChild('div', { className: 'reset', text: "Play Again"});
wuibuttonbehavior(reset);

var grid = main.createChild('div', { className: 'grid' });

game.createCards(grid);
game.reset();

clear.hide();

reset.on('tap', function () {
	clear.hide();
	game.reset();
});
