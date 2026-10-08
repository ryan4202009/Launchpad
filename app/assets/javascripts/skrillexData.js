// Additional user-added Skrillex sound packs.
// Each pack is generated from the corresponding source MP3 in public/zip/sounds/.

function makeSkrillexPackData(songNumber, songName, bpm, filename){
    var chain1 = [], chain2 = [], chain3 = [], chain4 = [];
    for(var i = 1; i <= 12; i++) chain1.push("c"+i);
    for(var i = 13; i <= 24; i++) chain2.push("c"+i);
    for(var i = 25; i <= 36; i++) chain3.push("c"+i);
    for(var i = 37; i <= 48; i++) chain4.push("c"+i);

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
