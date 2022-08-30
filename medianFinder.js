// O(log n) inserts
// O(log n) findMedian

// a self-balancing ost-bst, with support for duplicate values
// space is compressed in the case of duplicates...
// if this were an online data structure, that was ingesting
// a large dataset, with potentially many duplicate values...
// we could see a significant reduction in space

class MedianFinder {
	constructor() {
		this.root = null;
	}

	makeNode(key) {
		return {key, size: 1, count: 1, height: 0};
	}

	size(node) {
		let ls = node.left?.size || 0;
		let rs = node.right?.size || 0;
		return node.count + ls + rs;
	}

	height(node) {
		if (!node) return 0;
		let lh = node.left ? node.left.height : -1;
		let rh = node.right ? node.right.height : -1;
		return 1 + Math.max(lh, rh);
	}

	addNum(key) {
		function recurse(node) {
			if (!node) return _this.makeNode(key);
			// note the compression here...
			// duplicate values are stored in the node
			// as count for the numerical value...
			// while maintaining the numerical order
			// of the input and the validity of the BST...
			// using a modified version of
			// select(), this order statistic tree can handle duplicates
			if (key === node.key) node.count++;
			if (key < node.key) node.left = recurse(node.left);
			if (key > node.key) node.right = recurse(node.right);
			return _this.balance(node);
		}

		let _this = this;
		this.root = recurse(this.root);
	}

	// the special treatment here is that
	// a single node can hold multiple ranks...
	// in the case of duplicates...
	// so if the first 100 elements were 1s
	// for(let rank = 0; i<100;i++) assert(select(rank) === 1)
	// all stored in a single node
	select(rank) {
		function recurse(node, runningRank) {
			let lo = node.left?.size || 0;
			let hi = lo + node.count;
			if (runningRank === lo) return node.key;
			if (runningRank < lo) return recurse(node.left, runningRank);
			if (lo < runningRank && runningRank < hi) return node.key;
			if (runningRank >= hi) return recurse(node.right, runningRank - hi);
		}


		return recurse(this.root, rank);
	}

	// we use the avl
	// balancing strategy here
	balance(node) {
		let bf = this.balanceFactor(node);
		if (bf < -1) {
			let bfr = this.balanceFactor(node.right);
			if (bfr > 0) node.right = this.rotateRight(node.right);
			node = this.rotateLeft(node);
		}
		if (bf > 1) {
			let bfl = this.balanceFactor(node.left);
			if (bfl < 0) node.left = this.rotateLeft(node.left);
			node = this.rotateRight(node);
		}

		node.size = this.size(node);
		node.height = this.height(node);
		return node;
	}

	balanceFactor(node) {
		return this.height(node.left) - this.height(node.right);
	}

	rotateRight(node) {
		let root = node.left;
		node.left = root.right;
		root.right = node;

		root.size = this.size(root);
		root.height = this.height(root);
		node.size = this.size(node);
		node.height = this.height(node);
		return root;
	}

	rotateLeft(node) {
		let root = node.right;
		node.right = root.left;
		root.left = node;

		root.size = this.size(root);
		root.height = this.height(root);
		node.size = this.size(node);
		node.height = this.height(node);
		return root;
	}

	findMedian() {
		let treeSize = this.root.size;
		let isEven = treeSize % 2 === 0;
		if (isEven) {
			let lo = Math.ceil(treeSize / 2) - 1;
			let hi = lo + 1;
			return (mf.select(lo) + mf.select(hi)) / 2;

		} else {
			let medianRank = Math.ceil(treeSize / 2) - 1;
			return mf.select(medianRank);
		}
	}
}

let mf = new MedianFinder();
mf.addNum(1);
mf.addNum(1);
mf.addNum(1);
mf.addNum(1);
mf.addNum(1);
mf.addNum(1);
mf.addNum(1);
mf.addNum(2);
mf.addNum(2);
mf.addNum(2);
mf.addNum(3);
mf.addNum(4);
mf.addNum(4);
mf.addNum(4);
mf.addNum(4);
mf.addNum(5);
mf.addNum(5);
mf.addNum(5);
mf.addNum(5);
console.log('----');
for (let i = 0; i < mf.root.size; i++) {
	console.log(mf.select(i));
}
console.log('----');
console.log('ans', mf.findMedian());
console.log('----');






