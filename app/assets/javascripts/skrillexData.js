// Additional user-added Skrillex sound packs.
//
// The web Launchpad has 48 visible pads and four arrow-selected chains,
// giving 192 playable pad slots in total. The Bangarang project supplied
// by the user contains the real project samples; the GitHub Action builds
// all 192 slot files from those samples.

function makeSkrillexPackData(songNumber, songName, bpm, filename){
    var chain1 = [], chain2 = [], chain3 = [], chain4 = [];

    for(var i = 1; i <= 48; i++) chain1.push("c"+i);
    for(var i = 1; i <= 48; i++) chain2.push("c"+i);
    for(var i = 1; i <= 48; i++) chain3.push("c"+i);
    for(var i = 1; i <= 48; i++) chain4.push("c"+i);

    return {
        song_number: songNumber,
        song_name: songName,
        bpm: bpm,
        filename: filename,
        mappings:{chain1:chain1, chain2:chain2, chain3:chain3, chain4:chain4},
        holdToPlay:{chain1:[], chain2:[], chain3:[], chain4:[]},
        linkedAreas:{chain1:[], chain2:[], chain3:[], chain4:[]}
    };
}

var bangarangData = makeSkrillexPackData(7, "Skrillex - Bangarang", 110, "bangarang");
var scaryMonstersData = makeSkrillexPackData(8, "Skrillex - Scary Monsters and Nice Sprites", 140, "scary_monsters");
