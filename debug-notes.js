import { listNotes } from './server/services/notesService.js';

try {
  const notes = await listNotes();
  console.log('NOTES_COUNT', notes.length);
  console.log(JSON.stringify(notes.slice(0, 3), null, 2));
} catch (error) {
  console.error('LIST_NOTES_ERROR');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
}
