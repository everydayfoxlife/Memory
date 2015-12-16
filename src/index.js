var WuiDom = require('wuidom');
var inherits = require('util').inherits;
var wuibuttonbehavior = require('wuibuttonbehavior');

var DEVELOPMENT_MODE = true;

var htmlElement = document.querySelector('#main');
var main = new WuiDom(htmlElement);

var clear = main.createChild('div', { className: 'clear' });
clear.createChild('h2', { className: 'clearHeader', text: 'All Clear' });
var reset = clear.createChild('div', { className: 'reset', text: "Play Again"});
wuibuttonbehavior(reset);


var grid = main.createChild('div', { className: 'grid' });

clear.hide();

var col = 6;
var row = 4;

var symbolList = [
	'http://placehold.it/100/A10559/ffffff?text=CARD',
	'http://placehold.it/100/632065/ffffff?text=CARD',
	'http://placehold.it/100/F9A487/ffffff?text=CARD',
	'http://placehold.it/100/480320/ffffff?text=CARD',
	'http://placehold.it/100/AA66FF/ffffff?text=CARD',
	'http://placehold.it/100/BF92D5/ffffff?text=CARD',
	'http://placehold.it/100/23AA9F/ffffff?text=CARD',
	'http://placehold.it/100/35131E/ffffff?text=CARD',
	'http://placehold.it/100/423A75/ffffff?text=CARD',
	'http://placehold.it/100/F6F2E7/ffffff?text=CARD',
	'http://placehold.it/100/C7DFA3/ffffff?text=CARD',
	'http://placehold.it/100/FAF9E5/ffffff?text=CARD'
];

var isLocked = false;

function GameManager() {
	this.reset();
}

GameManager.prototype.reset = function(){
	this.firstFlippedCard = null;
	this.winCount = 0;
	isLocked = false;
}

GameManager.prototype.flipCard = function (card) {

	if (isLocked){
		return;
	}

	var self = this;

	card.disable();

	if (this.firstFlippedCard === null) {
		card.flip();
	    this.firstFlippedCard = card;
	} else {
		var isSameSymbol = this.firstFlippedCard.symbol === card.symbol;
		card.flip();

		var firstCard = this.firstFlippedCard;
		this.firstFlippedCard = null;

		if (isSameSymbol) {
			this.winCount++;
			console.log("Win", this.winCount);

			if (this.winCount === col * row / 2) {
				clear.show();
			}
		} else {

			isLocked = true;

			window.setTimeout(function () {
				card.flip();
				firstCard.flip();
				card.enable();
				firstCard.enable();
				isLocked = false;
			}, 1000);
		}
	}
};

var game = new GameManager();

function Card(symbol) {
    WuiDom.call(this, 'div', { className: 'card' });
    wuibuttonbehavior(this);

	this.isFlipped = true;
	this.symbol = null;

	var options = { className: 'image', attr: { src: ''}}

    if (DEVELOPMENT_MODE) {
    	//this.createChild('div', { className: 'hint', text: symbol });
    	// this.hint = this.createChild('div', { className: 'hint' });
    	this.hint = this.createChild('img', { className: 'hint'});
    }

	// this.cardFace = this.createChild('div', { className: 'cardFace', text: symbol });
	// this.cardFace = this.createChild('div', { className: 'cardFace' });
	this.cardFace = this.createChild('img', { className: 'cardFace'});

    this.on('tap', function () {
    	game.flipCard(this);
    	// this.isFlipped = !this.isFlipped;
    	// cardFace.toggleDisplay(this.isFlipped);
	});

	this.reset(symbol);
}

inherits(Card, WuiDom);

Card.prototype.flip = function () {
	this.isFlipped = !this.isFlipped;
	this.cardFace.toggleDisplay(this.isFlipped);
	this.cardFace.toggleClassName('flipped', this.isFlipped);
};

Card.prototype.reset = function(symbol){

	if (DEVELOPMENT_MODE) {
		this.hint.addClassNames(symbol);
		this.hint.rootElement.src = symbol;
    }

	this.cardFace.rootElement.src = symbol;
	this.symbol = symbol;

	this.isFlipped = true;
	this.flip();

	this.enable();
};

function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex ;

  // While there remain elements to shuffle...
  while (0 !== currentIndex) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    // And swap it with the current element.
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

var arr = [];

for (var i = 0; i < col * row; i ++) {
	var num = Math.floor(i / 2);
	arr.push(symbolList[num]);
}

arr = shuffle(arr);

var cards = [];

for (var i = 0; i < col * row; i ++) {
	// var symbol = symbolList[num];
	// var card = new Card(arr.pop());
	var card = new Card(arr[i]);
	cards.push(card);

	grid.appendChild(card);
}

function resetCards(){

	arr = shuffle(arr);

	for (var i = 0; i < col * row; i ++) {
		// var symbol = symbolList[num];
		// var card = new Card(arr.pop());
		var card = cards[i];
		card.reset(arr[i]);
	}
}

reset.on('tap', function () {
	clear.hide();
	resetCards();
	game.reset();
});
