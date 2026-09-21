const qrcode = require('qrcode-terminal');

const qrString = "2@Xg/8FccwA6OH+MvYgNzATSvl19YLvkEYk7dzrOSLLjgWk4xXZQ6qQ79Nwu0/T3pTWGF4dPYq2cb7xp/jzyPcB85Bk2iSsZrNm+E=,hxKSNweC+ybqGJYoJKvM+3pYA3ihnPA866RZ/OqOQBM=,jPRad7ejnVEo61QWk9Rfx42qWEyMu80ZvEUj58a7eFA=,eqlX7kwtkxC9UlPZvOFRBb67fqVJDc0RULut7IxsfKI=";

console.log('\n=== ESCANEIE AGORA (válido ~20s) ===\n');
qrcode.generate(qrString, { small: true }, (qrCode) => {
  console.log(qrCode);
  console.log('\n====================================\n');
  console.log('Escaneie no WhatsApp: Aparelhos conectados > Conectar um aparelho');
  console.log('Mantenha o app ABERTO durante a leitura.\n');
});