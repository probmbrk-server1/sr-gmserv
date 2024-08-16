
const gadgetconfig = {
 
    1: {
        use_limit: 389,
        cooldown: 500,
        gadget(player) {
            player.health = Math.min(player.health + Math.round(player.starthealth / 5), player.starthealth);
        },
    

    2: {
        
        uselimit: 34,
         gadget


        }
    },

};

module.exports = {
    gadgetconfig
};
