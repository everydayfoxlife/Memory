var WuiDom = require('wuidom');
var inherits = require('util').inherits;
var wuibuttonbehavior = require('wuibuttonbehavior');
var constants = require('./constants');

function Card(symbol, game) {
    WuiDom.call(this, 'div', { className: 'card' });
    wuibuttonbehavior(this);

	this.isFlipped = true;
	this.symbol = null;

	var options = { className: 'image', attr: { src: ''}}

    if (constants.DEVELOPMENT_MODE) {
    	this.hint = this.createChild('img', { className: 'hint'});
    }

	this.cardFace = this.createChild('img', { className: 'cardFace'});

    this.on('tap', function () {
    	game.flipCard(this);
	});

	this.reset(symbol);
}

inherits(Card, WuiDom);
module.exports = Card;

Card.prototype.flip = function () {
	this.isFlipped = !this.isFlipped;
	this.cardFace.toggleDisplay(this.isFlipped);
	this.cardFace.toggleClassName('flipped', this.isFlipped);
};

Card.prototype.reset = function(symbol){

	if (constants.DEVELOPMENT_MODE) {
		this.hint.addClassNames(symbol);
		this.hint.rootElement.src = symbol;
    }

	this.cardFace.rootElement.src = symbol;
	this.symbol = symbol;

	this.isFlipped = true;
	this.flip();

	this.enable();
};

