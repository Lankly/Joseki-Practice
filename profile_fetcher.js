// Stolen from: https://embed-twitter-profile.herokuapp.com

// Fetch Profile
fetch('https://embed-twitter-profile.herokuapp.com/api/v1/getuser/Lux_Forest')
.then(res => res.json())
.then(showProfile)
  
  // create elements and append to right documents.
  function showProfile(userProfile) {
    // Set display none for notice-badge
    // const noticeBadge = document.querySelector(".notice-badge");
    // noticeBadge.style.display = "none";
  
    // Remove profileCard and embedInfo if exists
    const profile = document.querySelector(".profileCard");
    const info = document.querySelector(".embedInfo");
  
    if (!!profile || !!info) {
      profile.remove();
      info.remove();
    }
  
    // Main section
    const mainElement = document.querySelector(".main");
    mainElement.style.cssText = `
      display: block;
    `;
    
    // profile card section
    const profileCard = createElement({
      type: "section",
      props: {class: "profileCard"}
    });
  
    const imageContainer = createElement({
      type: "div",
      props: {
        class: "img-container"
      },
      styles: `background-color: skyblue; background-image: url(${userProfile.profile_banner_url})`,
    });
  
    const profileImage = createElement({
      type: "img",
      props: {
        class: "profile-img",
        src: changeProfileImgUrl(userProfile.profile_image_url_https),
      },
    });
  
    const profileName = createElement({
      type: "div",
      props: {
        class: "profile-name",
      },
      content: `<p class="name">${userProfile.name}</p><p class="twitter-handle">@${userProfile.screen_name}</p>`
    });
  
    const profileBio = createElement({
      type: "p",
      props: {
        class: "profile-bio"
      },
      content: setDescLinks(userProfile.description),
    });
  
    const locationAndUrl = createElement({
      type: "p",
      props: {
        class: "location-and-url",
      },
      content: `<span class="location">📍 ${userProfile.location}</span> <span class="url">🔗 <a href="${userProfile.url}" target="_blank">${userProfile.url}</a></span>`,
    });
  
    const followCount = createElement({
      type: "p",
      props: {
        class: "follow-count",
      },
      content: `<span class="following"><span class="count">${userProfile.friends_count}</span> Following</span> <span class="followers"><span class="count">${userProfile.followers_count}</span> Followers</span>`,
    });
  
    imageContainer.appendChild(profileImage);
    profileCard.appendChild(imageContainer);
    profileCard.appendChild(profileName);
    profileCard.appendChild(profileBio);
    profileCard.appendChild(locationAndUrl);
    profileCard.appendChild(followCount);
  
    // Append profileCard and embedCode sections in mainElement.
    // mainElement.removeChild(mainElement.firstElementChild);
    mainElement.insertBefore(profileCard, mainElement.lastElementChild);
  }
  
  // Change profile image url to a higher dimesion url.
  function changeProfileImgUrl(url) {
    const reversedUrl = url.split("").reverse().join("");
    const reversedNewUrl = reversedUrl.replace("lamron", "004x004");
    const newUrl = reversedNewUrl.split("").reverse().join("");
  
    return newUrl;
  }
  
  // Make links in description clickable in profile bio.
  function setDescLinks(description) {
    const descArr = description.split(" ");
    const updatedDescArr = descArr.map(word => {
      if (word.startsWith("https") || word.startsWith("http")) {
        return `<a href="${word}" target="_blank">${word}</a>`;
      }
  
      return word;
    });
  
    return updatedDescArr.join(" ");
  }
  
  // Create element function.
  function createElement({type, props, styles, content}) {
    const element = document.createElement(type);
    for(let key in props) {
      element.setAttribute(key, props[key]);
    }
    element.innerHTML = content || "";
    element.style.cssText = styles;
  
    return element;
  }