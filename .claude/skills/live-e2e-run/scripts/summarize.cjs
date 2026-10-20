const fs = require('fs');
for (const n of process.argv.slice(2)) {
  const t = fs.readFileSync(`s${n}.json`, 'utf8'); const j = JSON.parse(t.match(/\{[\s\S]*\}/)[0]);
  const fd = j.firstDeposit?.claimed;
  console.log([j.user, JSON.stringify(j.balances), 'FD:' + (fd ? fd.amount + ' ' + fd.status : '-'),
    'roll:' + JSON.stringify(j.rollover), 'vip:' + j.vip?.name + ' wager ' + j.vip?.wager, 'kyc:' + JSON.stringify(j.kyc),
    'locked:' + j.affiliate?.lockedRewards?.locked].join(' | '));
}
