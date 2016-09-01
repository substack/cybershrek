#!/bin/bash
(cd node_modules/midi/examples
grep '<script src' MIDIPlayer.html \
  | sed 's/.*<script src=\"//; s/\".*//' \
  | xargs cat) > midi.js
rm -f soundfont
ln -s node_modules/midi/examples/soundfont .
