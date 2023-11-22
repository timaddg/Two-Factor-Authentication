const checkSession = async () => {
  const response = await fetch("/check");
  const { success, id } = await response.json();
  $("#loginForm").removeClass("codeRequested");
  $("#twoFABox").removeClass("ready");
  if (success) {
    $("body").addClass("logged");
    $("#userId").text(id);
  } else {
    $("body").removeClass("logged");
    $("#userId").text("");
  }
};


function showCustomPopup(message) {
  const customPopup = document.getElementById('customPopup');
  const customPopupMessage = document.getElementById('customPopupMessage');
  customPopupMessage.textContent = message;
  customPopup.style.display = 'block';

  // Close the popup when the close button is clicked
  document.getElementById('closePopup').addEventListener('click', function() {
      customPopup.style.display = 'none';
  });
}

jQuery(document).ready(($) => {
  checkSession();

  $("#logoutButton").click(async (e) => {
    await fetch(`/logout`);
    await checkSession();
  });

  $("#loginForm").submit(async (e) => {
    e.preventDefault();
    const id = e.target.id.value;
    const password = e.target.password.value;
    const code = e.target.code.value;
    let url = `/login?id=${id}&password=${password}`;
    if (code) url += `&code=${code}`;
    const response = await fetch(url);
    const { success, error, codeRequested } = await response.json();

    if (codeRequested) return $("#loginForm").addClass("codeRequested");

    if (success) {
      $("#loginForm").trigger("reset");
      await checkSession();
    } else {
      showCustomPopup(error);
    }
  });

  // registration
  $(document).ready(function() {
    // Function to show the custom popup
    // Function to show the custom popup
function showCustomPopup() {
  const $customPopup = $("#popupContainer");
  $customPopup.addClass("active");
  document.getElementById("overlay").style.display = "block";
}

// Function to close the custom popup
function closeCustomPopup() {
  const $customPopup = $("#popupContainer");
  $customPopup.removeClass("active");
  document.getElementById("overlay").style.display = "none";
}

  
    // Submit form and handle registration
    $("#registrationForm").submit(async (e) => {
      e.preventDefault();
  
      const username = $("input[name='id']").val();
      const password = $("input[name='password']").val();
  
      // Send a POST request to the server to handle user registration
      const response = await fetch("/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });
  
      const { success, error } = await response.json();
  
      if (success) {
        // Registration was successful, show the custom popup
        $("#registrationForm").trigger("reset"); // Clear the form
        showCustomPopup();
      } else {
        // Registration failed, you can handle the error as needed
        console.log("Error: " + error);
      }
    });
  
    // Close the custom popup when the "Close" button is clicked
    $("#popupContainer .popup-close").click(function(e) {
      e.preventDefault();
      closeCustomPopup();
    });
  });
  
  
  $("#enable2FAButton").click(async (e) => {
    const response = await fetch("/qrImage");
    const { image, success } = await response.json();
    if (success) {
      $("#qrImage").attr("src", image);
      $("#twoFABox").addClass("ready");
    } else {
      alert("Unable to fetch the scanner code");
    }
  });

  $("#twoFAUpdateForm").submit(async (e) => {
    e.preventDefault();
    const code = e.target.code.value;
    const response = await fetch("/set2FA?code=" + code);
    const { success } = await response.json();
    
    if (success) {
      $("#twoFAUpdateForm").trigger("reset");
    } else {
      alert("ERROR: Unable to update/enable 2FA");
    }
  });


  
});
