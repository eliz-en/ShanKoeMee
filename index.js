  // ============================================================
  //  SHAN KOE MEE — Final Rules
  // ============================================================
  (function () {
    'use strict';

    // ----- DOM refs -----
    const dealerCardsDiv = document.getElementById('dealerCards');
    const dealerChipsSpan = document.getElementById('dealerChips');
    const dealerResultDiv = document.getElementById('dealerResult');
    const playerCardsDiv = document.getElementById('playerCards');
    const playerChipsDisplay = document.getElementById('playerChipsDisplay');
    const myChipsSpan = document.getElementById('myChipsDisplay');
    const playerResultDiv = document.getElementById('playerResult');
    const playerStatusDiv = document.getElementById('playerStatus');
    const playerSeat = document.getElementById('playerSeat');
    const statusMsg = document.getElementById('statusMessage');
    const betInput = document.getElementById('betAmount');
    const dealBtn = document.getElementById('dealBtn');
    const hitBtn = document.getElementById('hitBtn');
    const standBtn = document.getElementById('standBtn');
    const chipOutOverlay = document.getElementById('chipOutOverlay');
    const restartBtn = document.getElementById('restartBtn');
    const howToPlayBtn = document.getElementById('howToPlayBtn');
    const howToPlayModal = document.getElementById('howToPlayModal');
    const modalCloseBtn = document.getElementById('modalCloseBtn');

    // Points display elements
    const playerPointsDisplay = document.getElementById('playerPointsDisplay');
    const playerPointsValue = document.getElementById('playerPointsValue');
    const playerPointsType = document.getElementById('playerPointsType');
    const playerNaturalBadge = document.getElementById('playerNaturalBadge');

    // ============================================================
    //  CONSTANTS
    // ============================================================
    const SUIT_RANK = {
      '♠': 4,   // Spade   — highest
      '♥': 3,   // Heart
      '♦': 2,   // Diamond
      '♣': 1    // Club    — lowest
    };

    const RANK_VALUE = {
      'A': 1,  '2': 2,  '3': 3,  '4': 4,  '5': 5,  '6': 6,  '7': 7,
      '8': 8,  '9': 9,  '10': 10, 'J': 11, 'Q': 12, 'K': 13
    };

    // ============================================================
    //  GAME STATE
    // ============================================================
    let playerChips = 500;
    let playerHand = [];
    let dealerHand = [];
    let deck = [];
    let roundActive = false;
    let roundEnded = false;
    let playerTurn = false;
    let currentBet = 10;
    let roundInProgress = false;
    let dealerCardsRevealed = false;

    // ============================================================
    //  DECK HELPERS
    // ============================================================
    function createDeck() {
      const suits = ['♠', '♥', '♦', '♣'];
      const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
      const d = [];
      for (const s of suits) {
        for (const r of ranks) {
          let value = 0;
          if (r === 'A') value = 1;
          else if (r === '10' || r === 'J' || r === 'Q' || r === 'K') value = 0;
          else value = parseInt(r, 10);
          d.push({ rank: r, suit: s, value });
        }
      }
      return d;
    }

    function shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    // ============================================================
    //  HAND EVALUATION
    // ============================================================
    function evaluateHand(hand) {
      if (!hand || hand.length === 0) {
        return {
          score: 0, multiplier: 1, type: 'normal',
          highRankValue: 0, highRankSuit: 0, natural: null
        };
      }

      const score = hand.reduce((sum, c) => sum + c.value, 0) % 10;

      const suitCount = {};
      const rankCount = {};
      for (const c of hand) {
        suitCount[c.suit] = (suitCount[c.suit] || 0) + 1;
        rankCount[c.rank] = (rankCount[c.rank] || 0) + 1;
      }
      const suitCounts = Object.values(suitCount);
      const rankCounts = Object.values(rankCount);

      let multiplier = 1;
      let type = 'normal';

      if (hand.length === 3) {
        if (rankCounts.includes(3)) {
          multiplier = 5; type = 'tripleRank';
        } else if (suitCounts.includes(3)) {
          multiplier = 3; type = 'tripleSuit';
        }
      } else if (hand.length === 2) {
        if (rankCounts.includes(2)) {
          multiplier = 2; type = 'pairRank';
        } else if (suitCounts.includes(2)) {
          multiplier = 2; type = 'pairSuit';
        }
      }

      let highRankValue = 0;
      let highRankSuit = 0;
      for (const c of hand) {
        const rv = RANK_VALUE[c.rank];
        const sv = SUIT_RANK[c.suit];
        if (rv > highRankValue ||
            (rv === highRankValue && sv > highRankSuit)) {
          highRankValue = rv;
          highRankSuit = sv;
        }
      }

      let natural = null;
      if (hand.length === 2) {
        if (score === 9) natural = 'koe';
        else if (score === 8) natural = 'chit';
      }

      return { score, multiplier, type, highRankValue, highRankSuit, natural };
    }

    // ============================================================
    //  HAND COMPARISON
    // ============================================================
    function compareHands(evalA, evalB) {
      if (evalA.score !== evalB.score) {
        return evalA.score > evalB.score ? 1 : -1;
      }
      if (evalA.highRankValue !== evalB.highRankValue) {
        return evalA.highRankValue > evalB.highRankValue ? 1 : -1;
      }
      if (evalA.highRankSuit !== evalB.highRankSuit) {
        return evalA.highRankSuit > evalB.highRankSuit ? 1 : -1;
      }
      return 0;
    }

    // ============================================================
    //  PAYOUT CALCULATION
    // ============================================================
    function calculatePayout(playerEval, dealerEval, bet) {
      const cmp = compareHands(playerEval, dealerEval);

      if (cmp > 0) {
        const winnings = bet * playerEval.multiplier;
        return {
          outcome: 'win',
          netChange: bet + winnings,
          displayAmount: winnings,
          message: `🎉 You win! +${winnings} chips` +
            (playerEval.multiplier > 1 ? ` (${getHandLabel(playerEval.type)})` : '')
        };
      }

      if (cmp < 0) {
        const totalLoss = bet * dealerEval.multiplier;
        const extraLoss = totalLoss - bet;
        return {
          outcome: 'lose',
          netChange: -extraLoss,
          displayAmount: totalLoss,
          message: `😔 Dealer wins! You lost ${totalLoss} chips` +
            (dealerEval.multiplier > 1 ? ` (${getHandLabel(dealerEval.type)})` : '')
        };
      }

      return {
        outcome: 'push',
        netChange: bet,
        displayAmount: bet,
        message: `🤝 Tie! Your bet is returned.`
      };
    }

    function getHandLabel(type) {
      switch (type) {
        case 'tripleRank': return 'TRIPLE ×5';
        case 'tripleSuit': return 'FLUSH ×3';
        case 'pairRank':   return 'PAIR ×2';
        case 'pairSuit':   return 'PWINT ×2';
        default:           return '';
      }
    }

    function getShortHandLabel(type) {
      switch (type) {
        case 'tripleRank': return 'TRIPLE ×5';
        case 'tripleSuit': return 'FLUSH ×3';
        case 'pairRank':   return 'PAIR ×2';
        case 'pairSuit':   return 'PWINT ×2';
        default:           return 'NORMAL ×1';
      }
    }

    // ============================================================
    //  RENDER HELPERS
    // ============================================================
    function createCardElement(card, hidden) {
      const div = document.createElement('div');
      div.className = 'card';
      if (hidden) {
        div.classList.add('card-back');
        div.innerHTML = '<span class="back-pattern">♠</span>';
        return div;
      }
      const isRed = card.suit === '♥' || card.suit === '♦';
      div.classList.add(isRed ? 'red' : 'black', 'card-reveal');
      div.innerHTML = `
        <div class="rank-suit">
          <span class="rank">${card.rank}</span>
          <span class="suit">${card.suit}</span>
        </div>`;
      return div;
    }

    function renderCards(container, hand, hideAll) {
      container.innerHTML = '';
      if (!hand || hand.length === 0) return;
      for (const card of hand) {
        container.appendChild(createCardElement(card, hideAll));
      }
    }

    // ============================================================
    //  LIVE POINTS DISPLAY
    // ============================================================
    function updatePlayerPoints() {
      // Hide if no cards
      if (!playerHand || playerHand.length === 0) {
        playerPointsValue.textContent = '—';
        playerPointsType.style.display = 'none';
        playerNaturalBadge.style.display = 'none';
        playerPointsDisplay.classList.remove('highlight');
        return;
      }

      const ev = evaluateHand(playerHand);

      // Update point value
      playerPointsValue.textContent = ev.score;

      // Update hand type label
      playerPointsType.textContent = getShortHandLabel(ev.type);
      playerPointsType.className = 'points-type ' + ev.type;
      playerPointsType.style.display = 'inline-block';

      // Show natural badge if applicable
      if (ev.natural && playerHand.length === 2) {
        playerNaturalBadge.textContent = ev.natural === 'koe' ? '⚡ NATURAL KOE' : '⚡ NATURAL CHIT';
        playerNaturalBadge.style.display = 'inline-block';
      } else {
        playerNaturalBadge.style.display = 'none';
      }

      // Highlight the panel while it's the player's turn
      if (playerTurn && roundActive && !roundEnded) {
        playerPointsDisplay.classList.add('highlight');
      } else {
        playerPointsDisplay.classList.remove('highlight');
      }
    }

    // ============================================================
    //  MAIN UI UPDATE
    // ============================================================
    function updateUI() {
      const hideDealer = (roundActive && !roundEnded && !dealerCardsRevealed);
      renderCards(dealerCardsDiv, dealerHand, hideDealer);
      dealerChipsSpan.textContent = '∞';

      if (roundEnded && dealerHand.length >= 2) {
        const ev = evaluateHand(dealerHand);
        let text = `${ev.score} pts`;
        const label = getHandLabel(ev.type);
        if (label) text += ` · ${label}`;
        dealerResultDiv.innerHTML = `<span class="result-tag push">${text}</span>`;
      } else {
        dealerResultDiv.innerHTML = '';
      }

      renderCards(playerCardsDiv, playerHand, false);
      playerChipsDisplay.textContent = playerChips;
      myChipsSpan.textContent = playerChips;

      // ---- LIVE POINTS DISPLAY ----
      updatePlayerPoints();

      if (roundActive && !roundEnded) {
        if (playerTurn) {
          playerStatusDiv.innerHTML = '<span class="status-badge acting">🎯 Your Turn</span>';
          playerSeat.classList.add('active-turn');
        } else {
          playerStatusDiv.innerHTML = '<span class="status-badge stood">⏳ Waiting</span>';
          playerSeat.classList.remove('active-turn');
        }
      } else {
        playerStatusDiv.innerHTML = '';
        playerSeat.classList.remove('active-turn');
      }

      if (roundEnded && playerHand.length >= 2) {
        const ev = evaluateHand(playerHand);
        let text = `${ev.score} pts`;
        const label = getHandLabel(ev.type);
        if (label) text += ` · ${label}`;
        playerResultDiv.innerHTML = `<span class="result-tag push">${text}</span>`;
      } else {
        playerResultDiv.innerHTML = '';
      }

      const canAct = playerTurn && roundActive && !roundEnded;
      hitBtn.disabled = !canAct;
      standBtn.disabled = !canAct;
      dealBtn.disabled = roundActive || roundEnded;
      betInput.disabled = roundActive || roundEnded;

      if (!roundEnded && roundActive) {
        if (playerTurn) {
          const ev = evaluateHand(playerHand);
          statusMsg.textContent = `🎯 You have ${ev.score} points — Hit or Stand?`;
        } else {
          statusMsg.textContent = '🤖 Dealer is thinking...';
        }
      } else if (!roundActive && !roundEnded) {
        statusMsg.textContent = '🃏 Place your bet and DEAL';
      }
    }

    // ============================================================
    //  GAME FLOW
    // ============================================================
    function startRound() {
      if (roundActive || roundEnded || roundInProgress) return;

      const bet = parseInt(betInput.value, 10) || 10;
      if (bet < 1) { alert('Bet must be at least 1'); return; }
      if (bet > playerChips) { alert('Not enough chips!'); return; }

      roundInProgress = true;
      dealerCardsRevealed = false;
      currentBet = bet;
      playerChips -= bet;

      deck = shuffle(createDeck());
      playerHand = [deck.pop(), deck.pop()];
      dealerHand = [deck.pop(), deck.pop()];

      roundActive = true;
      roundEnded = false;
      playerTurn = true;

      const playerEval = evaluateHand(playerHand);
      const dealerEval = evaluateHand(dealerHand);

      if (playerEval.natural || dealerEval.natural) {
        playerTurn = false;
        let msg = '⚡ Natural!';
        if (playerEval.natural) msg += ` You have ${playerEval.natural.toUpperCase()}`;
        if (dealerEval.natural) msg += ` · Dealer has ${dealerEval.natural.toUpperCase()}`;
        statusMsg.textContent = msg;
        updateUI();
        setTimeout(() => {
          dealerCardsRevealed = true;
          updateUI();
          setTimeout(showdown, 1500);
        }, 1000);
        return;
      }

      // Show the points and let the player decide
      updateUI();
      const ev = evaluateHand(playerHand);
      statusMsg.textContent = `🎯 You have ${ev.score} points — Hit or Stand?`;
      roundInProgress = false;
    }

    function playerHit() {
      if (!playerTurn || !roundActive || roundEnded || roundInProgress) return;
      if (deck.length === 0) { alert('No cards left!'); return; }

      playerHand.push(deck.pop());
      updateUI();

      if (playerHand.length >= 3) {
        playerTurn = false;
        statusMsg.textContent = "⏳ Dealer's turn...";
        roundInProgress = true;
        updateUI();
        setTimeout(() => {
          dealerCardsRevealed = true;
          updateUI();
          setTimeout(dealerTurn, 1000);
        }, 800);
      } else {
        // Still can act — show new points
        const ev = evaluateHand(playerHand);
        statusMsg.textContent = `🎯 You now have ${ev.score} points — Hit or Stand?`;
      }
    }

    function playerStand() {
      if (!playerTurn || !roundActive || roundEnded || roundInProgress) return;
      playerTurn = false;
      statusMsg.textContent = "⏳ Dealer's turn...";
      roundInProgress = true;
      updateUI();
      setTimeout(() => {
        dealerCardsRevealed = true;
        updateUI();
        setTimeout(dealerTurn, 1000);
      }, 800);
    }

    function dealerTurn() {
      if (roundEnded) return;

      let dealerEval = evaluateHand(dealerHand);
      while (dealerEval.score < 4 && deck.length > 0 && dealerHand.length < 3) {
        dealerHand.push(deck.pop());
        dealerEval = evaluateHand(dealerHand);
      }

      statusMsg.textContent = '🤖 Dealer played!';
      updateUI();
      setTimeout(showdown, 1200);
    }

    function showdown() {
      if (roundEnded) return;

      roundActive = false;
      roundEnded = true;
      playerTurn = false;
      roundInProgress = false;
      dealerCardsRevealed = true;

      const playerEval = evaluateHand(playerHand);
      const dealerEval = evaluateHand(dealerHand);

      const payout = calculatePayout(playerEval, dealerEval, currentBet);

      playerChips += payout.netChange;
      statusMsg.textContent = payout.message;

      if (payout.outcome === 'win') {
        playerResultDiv.innerHTML = `<span class="result-tag win">WIN +${payout.displayAmount}</span>`;
        dealerResultDiv.innerHTML = `<span class="result-tag lose">-${payout.displayAmount}</span>`;
      } else if (payout.outcome === 'lose') {
        playerResultDiv.innerHTML = `<span class="result-tag lose">LOSE -${payout.displayAmount}</span>`;
        dealerResultDiv.innerHTML = `<span class="result-tag win">+${payout.displayAmount}</span>`;
      } else {
        playerResultDiv.innerHTML = `<span class="result-tag push">PUSH</span>`;
        dealerResultDiv.innerHTML = `<span class="result-tag push">PUSH</span>`;
      }

      updateUI();

      if (playerChips <= 0) {
        setTimeout(() => { chipOutOverlay.style.display = 'flex'; }, 1200);
        return;
      }

      setTimeout(resetGame, 3000);
    }

    function resetGame() {
      playerHand = [];
      dealerHand = [];
      deck = [];
      roundActive = false;
      roundEnded = false;
      playerTurn = false;
      roundInProgress = false;
      dealerCardsRevealed = false;
      playerResultDiv.innerHTML = '';
      dealerResultDiv.innerHTML = '';
      playerStatusDiv.innerHTML = '';
      playerPointsValue.textContent = '—';
      playerPointsType.style.display = 'none';
      playerNaturalBadge.style.display = 'none';
      playerPointsDisplay.classList.remove('highlight');
      playerSeat.classList.remove('active-turn');
      statusMsg.textContent = '🃏 Place your bet and DEAL';
      updateUI();
    }

    function restartGame() {
      chipOutOverlay.style.display = 'none';
      playerChips = 500;
      resetGame();
    }

    // ============================================================
    //  MODAL CONTROLS
    // ============================================================
    function openModal() {
      howToPlayModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }

    function closeModal() {
      howToPlayModal.style.display = 'none';
      document.body.style.overflow = '';
    }

    // ============================================================
    //  EVENT LISTENERS
    // ============================================================
    dealBtn.addEventListener('click', startRound);
    hitBtn.addEventListener('click', playerHit);
    standBtn.addEventListener('click', playerStand);
    restartBtn.addEventListener('click', restartGame);
    howToPlayBtn.addEventListener('click', openModal);
    modalCloseBtn.addEventListener('click', closeModal);

    howToPlayModal.addEventListener('click', (e) => {
      if (e.target === howToPlayModal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && howToPlayModal.style.display === 'flex') {
        closeModal();
      }
    });

    betInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') startRound();
    });

    updateUI();
  })();