window.onload = function () {
  setTimeout(() => {
    const messageBox = document.getElementById('message-box');
    if (messageBox) {
      messageBox.classList.add('fade');
    }
  }, 5000);
}
