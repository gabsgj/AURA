export async function playConfirmationAudio(text){
  if ('speechSynthesis' in window){
    const utter = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utter);
  }
}