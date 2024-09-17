// Function to replace every feather i tag to the correspondent icon
feather.replace();

// Function to set navbar item active on click
var links = document.querySelectorAll(".nav-item");
var len = links.length;
while(len-- && len>=0){
    links[len].addEventListener('click', function() {
        var current = document.querySelector(".nav-item.active");
        current.className = current.className.replace(" active", "");
        this.className += " active";
    }
)};