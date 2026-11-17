# BeatFoundry app
Building on the current framework I would like this to be an application with these features arranges in the following tabs. Include any required packages to make this work. 
## Tempo
This needs to display the current measured tempo prominantly in the centre of the screen. It will need the ability to listen to audio through the device's microphone to detect the current tempo and display it as BPM (beats per minute) to an accuracy of a single decimal place. 
## Metronome
A simple page that will deliver a pre-defined click to the device's speaker at a given tempo defined as BPM. There would be a prominent display of the current tempo, increment/ecrement buttons and a 'performance' button that would stop the clicks after a set number of events. The time signature would be 4/4 but with an option to expande on this later. 
## Repetoire
A sortable and filterable table that can store and list all songs. They need to be save as song name with their associated BPM tempo. This table will need to be synchronised with an external service.  
## Setlist
A editable table that would be made up of items from the Repetoire table. The user should be able to select items from the repetoire and reorder them.  Optional section breaks defined as; Set 1, Set 2, Set 3 and Encore could be added too. The display only needs to show the song name. 
## Performance
This mode needs to show 3 things:

1. Current song - taken from the setlist table starting from the top. There should be buttons to move forward/back through the setlist. 
2. Metronome - should show the tempo of the selected song with a toggleable Start/Stop button to control the audio metronome. It should include a 'performace' button as perviously defined. 
3. Tempo - the current detected tempo. 