class Graph {
    constructor() {
        this.nodes = [];
    }

    getNode( nodeID ) {
        return this.nodes.filter( node => node.id === nodeID)
    }

    
}


class GraphNode {
    constructor(message) {
        this.id = 0;
        this.messages = [];
        this.edges = [];
        this.parentNode
    }

    addMessage( message ){
        this.messages.push( message )
    }

    addOption( graphNodeInstance ){
        this.edges.push( graphNodeInstance.id )
        graphNodeInstance.parentNode = this.id 
    }


}

module.exports = { Graph, GraphNode };
