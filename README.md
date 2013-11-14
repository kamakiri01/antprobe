antprobe.js
==========

Ant Colony Optimization(ACO) by javascript. 

What is ACO?
- [ant colony optimization algorithms - wikipedia(en)](http://en.wikipedia.org/wiki/ant_colony_optimization_algorithms)
- [蟻コロニー最適化 - wikipedia(ja)](http://ja.wikipedia.org/wiki/%E8%9F%BB%E3%82%B3%E3%83%AD%E3%83%8B%E3%83%BC%E6%9C%80%E9%81%A9%E5%8C%96)

Demo
--------

This demo need WebWorker supported .

[Demo site](http://phasespaces.net/garage/antprobe/)

Validation
-------------

- google Chrome 29

How to use Demo
------

console
- start/stop button
	- start calculation or stop it.
- reset buton
	- reset status to initinal state.
- City configuration
	- Number of cities
		- set number of cities.(optimize your processivity.)
- Ant configuration
	- Ant priority heuristic 
		- set ant's criterion of heuristic. This is susceptible to distance.
	- Ant priority pheromone
		- set ant's criterion of heuristic. This is susceptible to pheromone mapping.
	- Ant colony scale
		- set number of ants.(optimize your processivity.)
	- Ant pheromone density
		- set influence of one ant.
	- Pheromone evaporation speed
		- set disappearance speed of weited routes.

view
- Touch cities and moving, fix city position. After it, push "apply".

License
-------

MIT License
