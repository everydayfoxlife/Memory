var constants = require('./constants');
var shuffle = require('./shuffle');
var Card = require('./Card');

var arr = [];

for (var i = 0; i < constants.col * constants.row; i ++) {
	var num = Math.floor(i / 2);
	arr.push(constants.symbolList[num]);
}

arr = shuffle(arr);


//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Manage cards and user interactions
 *
 */
function GameManager() {
	this.firstFlippedCard = null;
	this.winCount = 0;
	this.isLocked = false;
	this.cards = [];
}

module.exports = GameManager;

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Reset the game: flip face down alls cards, and reset all variables */
GameManager.prototype.reset = function(){
	this.firstFlippedCard = null;
	this.winCount = 0;
	this.isLocked = false;

	this.resetCards();
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** creating all cards in the game. This function is called only once at startup.
 *
 * @param {WuiDom} grid - WuiDom object that will contains the cards
 */
GameManager.prototype.createCards = function (grid) {
	for (var i = 0; i < constants.col * constants.row; i ++) {
		var card = new Card(arr[i], this);
		this.cards.push(card);
	
		grid.appendChild(card);
	}
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** shuffle cards */
GameManager.prototype.resetCards = function(){

	arr = shuffle(arr);

	for (var i = 0; i < constants.col * constants.row; i ++) {
		var card = this.cards[i];
		card.reset(arr[i]);
	}
}

//▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
/** Flip a card face up
 *
 * @param {WuiDom} card - the card that user want to flip
 */
GameManager.prototype.flipCard = function (card) {

	if (this.isLocked){
		return;
	}

	var self = this;

	card.disable();

	if (this.firstFlippedCard === null) {
		// this is the first card we flip
		card.flip();
	    this.firstFlippedCard = card;
	} else {
		// this is the second card we flip
		var isSameSymbol = this.firstFlippedCard.symbol === card.symbol;
		card.flip();

		var firstCard = this.firstFlippedCard;
		this.firstFlippedCard = null;

		if (isSameSymbol) {
			this.winCount++;
			console.log("Win", this.winCount);

			if (this.winCount === constants.col * constants.row / 2) {
				clear.show();
			}
		} else {

			this.isLocked = true;

			window.setTimeout(function () {
				card.flip();
				firstCard.flip();
				card.enable();
				firstCard.enable();
				self.isLocked = false;
			}, 1000);
		}
	}
};

