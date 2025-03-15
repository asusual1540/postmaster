const API_AUTH_URL = "https://sso.ekdak.com";
const API_GET_URL = "https://ekdak.com";
const API_POST_URL = "https://t.ekdak.com";
// const API_AUTH_URL = "http://192.168.1.18:8000";
// const API_GET_URL = "http://192.168.1.18:8002";
// const API_POST_URL = "http://192.168.1.18:8002";

// Define queryParams globally so it can be accessed across filters & pagination
let current_date = new Date();
current_date.setHours(current_date.getHours() + 6); // Shift time forward by 6 hours
let create_from = current_date.toISOString().split("T")[0] + "T00:00";
let create_to = current_date.toISOString().slice(0, 16);

let queryParams = {
    page: 1,
    per_page: 10,
    bag_id: "",
    bag_category: "all",
    bag_type: "all",
    handling: "all",
    status: "all",
    dest_branch_code: "",
    created_at_from: create_from,
    created_at_to: create_to
};

let bagItemQueryParams = {
    page: 1,
    per_page: 10,
    bag_id: "",
    is_item_bag: "all",
    bag_type: "all",
    branch_code: "",
    item_bag_id: "",
    status: "all"
};

let cache = {};
let bag_items_cache = {};

$(document).ready(function () {
    let selectedArticles = new Set();
    let hasSelectedArticles = false;
    // Function to toggle row selection

    // // Get today's date
    // let now = new Date();

    // // Format the date-time properly for datetime-local input (YYYY-MM-DDTHH:MM)
    // function formatDateTime(date) {
    //     let year = date.getFullYear();
    //     let month = String(date.getMonth() + 1).padStart(2, "0"); // Ensure two digits
    //     let day = String(date.getDate()).padStart(2, "0");
    //     let hours = String(date.getHours()).padStart(2, "0");
    //     let minutes = String(date.getMinutes()).padStart(2, "0");

    //     return `${year}-${month}-${day}T${hours}:${minutes}`;
    // }

    // // Set from = start of today (00:00:00)
    // let todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    // let todayEnd = now; // Current time

    // Set values in the datetime-local inputs
    $("#created_at_from").val(create_from)
    $("#created_at_to").val(create_to);

    // Ensure queryParams also includes this default date range
    // queryParams.created_at_from = formatDateTime(todayStart);
    // queryParams.created_at_to = formatDateTime(todayEnd);



    let token = getCookie("access");
    console.log("Access token:", token);
    if (!token) {
        console.log("No token found. Showing login form.");
        $(".authenticating").hide();
        $("#login-backdrop").show();
        $("#login-container").show();
        $("#login-form").show();
    } else {
        $("#login-backdrop").show();
        $(".authenticating").show();
        // $("#login-container").hide();
        $("#login-form").hide();
        verifyUser(token);
    }

    // Attach event to Receive button
    // $("#receive-selected").on("click", receiveSelectedArticles);
    // Attach event to Receive All button
    $("#receive-all").on("click", receiveAllBagItems);

    $(document).on("click", "#logout-btn", function () {
        console.log("Logging out...");
        showLogin();
        deleteCookie("access");
        deleteCookie("refresh");
        console.log("No token found. Showing login form.");

    });

    $(window).on('resize', function () {
        if ($(window).height() < originalHeight) {
            $(".login-container").css("margin-top", "-20vh");
        } else {
            $(".login-container").css("margin-top", "0");
        }
    });

    $(document).on("focus", "#phone", function () {
        var $input = $(this);
        setTimeout(function () {
            window.scrollTo(0, $input.offset().top - 300);
        }, 300);
    });

    $(document).on("click", "#filter_apply", function () {
        // Get values from input fields
        let createdAtFrom = document.getElementById("created_at_from").value;
        let createdAtTo = document.getElementById("created_at_to").value;
        let bagId = document.getElementById("bag_id").value.trim();
        let status = document.getElementById("bag_status").value;

        // Reset queryParams to default
        // queryParams = {
        //     page: 1, // Reset to first page on filter apply
        //     per_page: 20
        // };

        // Add bag_id only if it's not empty
        if (bagId) {
            queryParams.bag_id = bagId;
        }

        // Add status only if it's not "all"
        if (status !== "all") {
            queryParams.status = status;
        }

        // Add date filters if selected
        if (createdAtFrom) {
            queryParams.created_at_from = createdAtFrom;
        }

        if (createdAtTo) {
            queryParams.created_at_to = createdAtTo;
        }
        console.log("Query params:", queryParams);
        // Fetch bags with updated filters
        let token = getCookie("access");
        console.log("Access token:", token);
        fetchBags(token, queryParams);
    });

    // Add click event to bag rows
    $(document).on("click", ".bag-row", function () {
        let bagId = $(this).attr("bag_id");
        console.log("Fetching bag details for:", bagId);
        let token = getCookie("access");
        console.log("Access token:", token);
        queryParams.bag_id = bagId;
        openBagItemsModal(token, queryParams);
    });

    // Attach event to article row click
    $(document).on("click", ".bag-article-row", function () {
        let articleId = $(this).attr("article_id");
        console.log("Fetching article details for:", articleId);
        openArticleDetailsModal(articleId);
    });
    // Attach event to add bag click
    $(document).on("click", "#receive_bag", function () {
        openReceiveBagModal();
    });

    // Close modal on clicking the backdrop
    $(document).on("click", "#bag-items-backdrop", function (event) {
        if (event.target.id === "bag-items-backdrop") {
            closeBagItemsModal();
        }
    });

    // Close modal on clicking the backdrop
    $(document).on("click", "#receive-bag-backdrop", function (event) {
        if (event.target.id === "receive-bag-backdrop") {
            closeAddBagModal();
        }
    });

    // Function to close article details modal when clicking outside
    $(document).on("click", "#article-details-backdrop", function (event) {
        if (event.target.id === "article-details-backdrop") {
            closeArticleDetailsModal();
        }
    });

    $(document).on("click", "#scan-bag-btn", function () {
        let bagId = $("#scan-bag-input").val().trim();
        console.log("Scanned bag ID:", bagId);
        if (bagId) {
            let accessToken = getCookie("access");
            // console.log("Access token:", accessToken);
            bagItemQueryParams.bag_id = bagId;
            fetchScannedBagItems(accessToken, bagItemQueryParams);
        }
    });

    $("#bag_per_page").on("change", function () {
        queryParams.per_page = parseInt($(this).val());
        queryParams.page = 1; // Reset to first page when per_page changes
        fetchBags(getCookie("access"), queryParams);
    });


    $("#prevPage").click(() => { queryParams.page--; fetchBags(token, queryParams); });
    $("#nextPage").click(() => { queryParams.page++; fetchBags(token, queryParams); });
    $("#searchBagId").click(() => { queryParams.bag_id = $("#bagIdInput").val(); fetchBags(token, queryParams); });
    $("#searchDestBranch").click(() => { queryParams.dest_branch_code = $("#destBranchInput").val(); fetchBags(token, queryParams); });

    $('#login-btn').click(function () {
        // Get values from input fields
        console.log("Login button clicked");
        let phone = $('#phone').val().trim();
        let password = $('#password').val().trim();
        let errorMsg = $('#login-error');

        // Simple validation
        if (phone === '' || password === '') {
            errorMsg.text('Phone number and password are required.');
            return;
        }

        // API request payload
        let requestData = {
            username: `${phone}`,
            password: password,
            group: "post-master",
            service: "rms"
        };
        console.log("Request data:", requestData);
        $.ajax({
            url: `${API_AUTH_URL}/sso/v1/land-existing-dms-user/`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(requestData),
            success: function (response) {
                if (response.status === "success") {
                    hideLogin();
                    console.log("Login successful:", response);
                    if (response && response["username"]) {
                        $("#login-username").text(response["username"]);
                    }
                    fetchBags(response.access, queryParams);

                    // Store access and refresh tokens in cookies
                    document.cookie = `access=${response.access}; path=/`;
                    document.cookie = `refresh=${response.refresh}; path=/`;
                    // document.cookie = `access=${response.access}; path=/; Secure`;
                    // document.cookie = `refresh=${response.refresh}; path=/; Secure`;

                    // Redirect or show success message
                    // window.location.href = "/"; // Change this to the actual dashboard URL
                } else {
                    console.error("Login failed:", response);
                    errorMsg.text(response.message || 'Login failed. Please try again.');
                }
            },
            error: function (xhr) {
                console.error("Login request failed:", xhr);
                let errorText = xhr.responseJSON ? xhr.responseJSON.message : 'Login request failed.';
                errorMsg.text(errorText);
            }
        });
    });
    // Open Article Button
    // $("#open-article").on("click", function () {
    //     if (selectedArticles.size === 0) {
    //         alert("No articles selected.");
    //         return;
    //     }
    //     selectedArticles.forEach(articleId => openArticleDetailsModal(articleId));
    // });
    // verifyUser();
    // Function to toggle row selection
    function toggleArticleSelection(articleId, rowElement, forceSelect = null) {
        let shouldSelect = forceSelect !== null ? forceSelect : !selectedArticles.has(articleId);

        if (shouldSelect) {
            selectedArticles.add(articleId);
            rowElement.addClass("selected-row");
            rowElement.find(".article-checkbox").prop("checked", true);
        } else {
            selectedArticles.delete(articleId);
            rowElement.removeClass("selected-row");
            rowElement.find(".article-checkbox").prop("checked", false);
        }

        updateButtonsState();
    }

    // Attach click event for row selection
    $(document).on("click", ".scan-bag-article-row", function () {
        let articleId = $(this).attr("article_id");
        toggleArticleSelection(articleId, $(this));
    });

    // Checkbox selection
    $(document).on("change", ".article-checkbox", function () {
        let articleId = $(this).closest("tr").attr("article_id");
        let rowElement = $(this).closest("tr");
        toggleArticleSelection(articleId, rowElement);
    });

    // Select All Button
    $("#select-all-articles").on("click", function () {
        $(".scan-bag-article-row").each(function () {
            let articleId = $(this).attr("article_id");
            if (!selectedArticles.has(articleId)) {
                selectedArticles.add(articleId);
                $(this).addClass("selected-row");
                $(this).find(".article-checkbox").prop("checked", true);
            }
        });
        updateButtonsState();
    });

    // Deselect All Button
    $("#deselect-all-articles").on("click", function () {
        selectedArticles.clear();
        $(".scan-bag-article-row").removeClass("selected-row");
        $(".article-checkbox").prop("checked", false);
        updateButtonsState();
    });



    // Receive Selected Articles
    $("#receive-selected").on("click", function () {
        if (selectedArticles.size === 0) {
            alert("No articles selected.");
            return;
        }
        console.log("Receiving articles:", Array.from(selectedArticles));
        let total_selected = selectedArticles.size;
        selectedArticles.clear();
        $(".selected-row").removeClass("selected-row");
        $(".article-checkbox").prop("checked", false);
        updateButtonsState();
        alert(`Receiving ${total_selected} articles`);
    });

    // Delete Selected Articles
    $("#delete-selected").on("click", function () {
        if (selectedArticles.size === 0) {
            alert("No articles selected.");
            return;
        }
        console.log("Deleting articles:", Array.from(selectedArticles));
        selectedArticles.forEach(articleId => {
            $(`.scan-bag-article-row[article_id="${articleId}"]`).remove();
        });
        selectedArticles.clear();
        updateButtonsState();
    });

    // Search and Select an Article
    $("#scan-article-btn").on("click", function () {
        let searchQuery = $("#scan-article-input").val().trim();
        if (!searchQuery) return;

        let matchingRow = $(`.scan-bag-article-row[article_id="${searchQuery}"]`);
        if (matchingRow.length) {
            toggleArticleSelection(searchQuery, matchingRow);
        } else {
            alert("No matching article found.");
        }
    });

    // Function to update button states
    function updateButtonsState() {
        let hasSelection = selectedArticles.size > 0;
        $("#receive-selected, #delete-selected, #deselect-all-articles").prop("disabled", !hasSelection);
        $("#scanned-bag-items-table_selected").text(`Selected Articles: ${selectedArticles.size}`);
    }

});



function getCookie(name) {
    var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
}

function setCookie(name, value, days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + value + "; path=/" + expires;
}

function deleteCookie(name) {
    document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}

function verifyUser(token) {
    $.ajax({
        url: API_AUTH_URL + "/sso/token-verify/",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({ access: token }),
        success: function (response) {
            // console.log("User verified:", response);
            if (response["decoded_data"] && response["decoded_data"]["username"]) {
                $("#login-username").text(response["decoded_data"]["username"]);
            }
            hideLogin();
            fetchBags(token, queryParams);
        },
        error: function () {
            showLogin();
            deleteCookie("access");
            deleteCookie("refresh");

        }
    });
}
function restoreHeaderStyles() {
    $("#header").css({
        "display": "flex",
        "justify-content": "space-between",
        "align-items": "center",
        "background": "#006A4E", // Ensure color remains
        "color": "white"
    });
}

function showLogin() {
    $(".authenticating").hide();
    $("#login-backdrop").show();
    $("#login-container").show();
    $("#login-form").show();

}

function hideLogin() {
    $(".authenticating").hide();
    $("#login-backdrop").hide();
    $("#login-container").hide();
    $("#login-form").hide();

}

function showApp(token, queryParams) {
    fetchBags(token, queryParams);
}

function constructQueryString() {
    let url = `${API_GET_URL}/v1/dms-legacy-core-logs/get-bags/?page=${queryParams.page}&per_page=${queryParams.per_page}`;

    if (queryParams.bag_id) url += `&bag_id=${queryParams.bag_id}`;
    if (queryParams.dest_branch_code) url += `&dest_branch_code=${queryParams.dest_branch_code}`;
    if (queryParams.bag_category && queryParams.bag_category !== "all") url += `&bag_category=${queryParams.bag_category}`;
    if (queryParams.bag_type && queryParams.bag_type !== "all") url += `&bag_type=${queryParams.bag_type}`;
    if (queryParams.handling && queryParams.handling !== "all") url += `&handling=${queryParams.handling}`;
    if (queryParams.status && queryParams.status !== "all") url += `&status=${queryParams.status}`;

    if (queryParams.created_at_from) {
        let [dateFrom, timeFrom] = queryParams.created_at_from.split("T");
        url += `&create_date_from=${dateFrom}`
        url += `&create_time_from=${timeFrom}`
    };

    if (queryParams.created_at_to) {
        let [dateTo, timeTo] = queryParams.created_at_to.split("T");
        url += `&create_date_to=${dateTo}`
        url += `&create_time_to=${timeTo}`
    };

    return url;
}

function fetchBags(token, queryParams) {
    let url = constructQueryString(queryParams);
    // console.log("Fetching from URL:", url);

    // Check cache to avoid unnecessary API calls
    if (cache[url]) {
        // console.log("Using cached data:", cache[url]);
        updateBagTable(cache[url].results);
        updatePagination("bagTable", "bag-pagination", cache[url].page, cache[url].total, cache[url].per_page, fetchBags);
        restoreHeaderStyles();
        return;
    }


    $.ajax({
        url: url,
        type: "GET",
        headers: { "Authorization": `Bearer ${token}` },
        success: function (response) {
            $("#bagTable").show();
            // console.log("Data fetched successfully", response);

            // Store response in cache
            cache[url] = response;

            updateBagTable(response.results);
            // updateBagPagination(response.page, response.total, response.per_page);
            updatePagination("bagTable", "bag-pagination", response.page, response.total, response.per_page, fetchBags);
            restoreHeaderStyles();
        },
        error: function (e) {
            console.log("Error fetching data", e.responseJSON);
        }
    });
}

function updateBagTable(data) {
    // console.log("Updating bag table with data:", data);
    $("#bagTable tbody").empty();
    if (data.length === 0) {
        $("#bagTable tbody").append("<tr><td colspan='6'>No records found</td></tr>");
        return;
    }

    data.forEach(bag => {
        // console.log("Bag:", bag);
        $("#bagTable tbody").append(`
            <tr class="bag-row" bag_id="${bag.Bag_ID}">
                <td>${bag.Bag_ID}</td>
                <td>${bag.Create_Total_Item_Count}(${bag.Delivered_Item_Count}/<span style="color: #ff2800">${bag.Create_Total_Item_Count - bag.Delivered_Item_Count}</span>)</td>
                <td>${bag.Create_Date} ${bag.Create_Time}</td>
                <td>${bag.Status}</td>
            </tr>
        `);
    });
}

// <td>${bag.Bag_Category}</td>
// <td>${bag.Bag_Type}</td>
// <td>${bag.Dest_Branch_Code}</td>



// Function to open modal and fetch bag items
function openBagItemsModal(token, queryParams) {
    // console.log("queryParams openBagItemsModal", queryParams);
    $("#bag-items-backdrop").show();
    $("#bag-items-table tbody").html('<tr><td colspan="3">Loading...</td></tr>'); // Show loading
    fetchBagItems(token, queryParams);
}



function constructBagItemQueryString(bagItemQueryParams) {
    let url = `${API_GET_URL}/v1/dms-legacy-core-logs/get-bag-items/?page=${bagItemQueryParams.page}&per_page=${bagItemQueryParams.per_page}`;

    if (bagItemQueryParams.bag_id) url += `&bag_id=${bagItemQueryParams.bag_id}`;
    if (bagItemQueryParams.branch_code) url += `&branch_code=${bagItemQueryParams.branch_code}`;
    if (bagItemQueryParams.is_item_bag && bagItemQueryParams.is_item_bag !== "all") url += `&is_item_bag=${bagItemQueryParams.is_item_bag}`;
    if (bagItemQueryParams.bag_type && bagItemQueryParams.bag_type !== "all") url += `&bag_type=${bagItemQueryParams.bag_type}`;
    if (bagItemQueryParams.item_bag_id && bagItemQueryParams.item_bag_id !== "all") url += `&item_bag_id=${bagItemQueryParams.item_bag_id}`;
    if (bagItemQueryParams.status && bagItemQueryParams.status !== "all") url += `&status=${bagItemQueryParams.status}`;

    // if (bagItemQueryParams.created_at_from) {
    //     let [dateFrom, timeFrom] = bagItemQueryParams.created_at_from.split("T");
    //     url += `&create_date_from=${dateFrom}`
    //     url += `&create_time_from=${timeFrom}`
    // };

    // if (bagItemQueryParams.created_at_to) {
    //     let [dateTo, timeTo] = bagItemQueryParams.created_at_to.split("T");
    //     url += `&create_date_to=${dateTo}`
    //     url += `&create_time_to=${timeTo}`
    // };

    return url;
}
function getBagIdFromUrl(url) {
    const urlObj = new URL(url);
    return urlObj.searchParams.get("bag_id");
}
// Function to fetch bag items
function fetchBagItems(token, bagItemQueryParams) {

    let url = constructBagItemQueryString(bagItemQueryParams);
    // console.log("Fetching from URL:", url);

    // Check cache to avoid unnecessary API calls
    if (bag_items_cache[url]) {
        // console.log("Using cached data:", bag_items_cache[url]);
        let _bagid = getBagIdFromUrl(bag_items_cache[url])
        updateBagItemsTable(bag_items_cache[url].results, _bagid);
        updatePagination("bag-items-table", "bag-items-pagination", bag_items_cache[url].page, bag_items_cache[url].total, bag_items_cache[url].per_page, fetchBagItems);
        return;
    }

    // let url = `http://localhost:8002/v1/dms-legacy-core-logs/get-bag-items/?bag_id=${bagId}&page=1&per_page=15`;
    let _bagid = getBagIdFromUrl(url)
    $.ajax({
        url: url,
        type: "GET",
        headers: { "Authorization": `Bearer ${token}` },
        success: function (response) {
            // console.log("Bag items fetched:", response);
            updateBagItemsTable(response.results, _bagid);
            updatePagination("bag-items-table", "bag-items-pagination", response.page, response.total, response.per_page, fetchBagItems);
        },
        error: function (e) {
            console.error("Error fetching bag items", e);
            $("#bag-items-table tbody").html('<tr><td colspan="3">Failed to load data</td></tr>');
        }
    });
}

// Function to fetch bag items
function fetchScannedBagItems(token, bagItemQueryParams) {
    let url = constructBagItemQueryString(bagItemQueryParams);
    // console.log("Fetching from scan URL:", url);

    // Check cache to avoid unnecessary API calls
    if (bag_items_cache[url]) {
        // console.log("Using cached data:", bag_items_cache[url]);
        updateScanBagItemsTable(bag_items_cache[url].results);
        updatePagination("scanned-bag-items-table", "scanned-bag-items-pagination", bag_items_cache[url].page, bag_items_cache[url].total, bag_items_cache[url].per_page, fetchScannedBagItems);
        return;
    }

    // let url = `http://localhost:8002/v1/dms-legacy-core-logs/get-bag-items/?bag_id=${bagId}&page=1&per_page=15`;

    $.ajax({
        url: url,
        type: "GET",
        headers: { "Authorization": `Bearer ${token}` },
        success: function (response) {
            // console.log("Bag items fetched:", response);
            updateScanBagItemsTable(response.results);
            updatePagination("scanned-bag-items-table", "scanned-bag-items-pagination", response.page, response.total, response.per_page, fetchScannedBagItems);
            $("#receive-all").prop("disabled", response.results.length === 0);
        },
        error: function (e) {
            console.error("Error fetching bag items", e);
            $("#scanned-bag-items-table tbody").html('<tr><td colspan="3">Failed to load data</td></tr>');
        }
    });
}

// Function to update modal table
function updateBagItemsTable(data, bagId) {
    $(".bag-item-title-value").text(`${bagId}`);
    let tbody = $("#bag-items-table tbody");
    tbody.empty();

    if (data.length === 0) {
        tbody.append("<tr><td colspan='3'>No records found</td></tr>");
        return;
    }

    data.forEach(item => {
        let _status = item.Delivery_Status;
        if (_status == "Del_To_Rec") {
            _status = "Delivered";
        }
        else if (_status == "Ret_To_Sen") {
            _status = "Returned";
        } else if (_status == "Landed") {
            _status = "Received";
        }
        tbody.append(`
            <tr class="bag-article-row" article_id="${item.Item_Bag_ID}">
                <td>${item.Item_Bag_ID}</td>
                <td>${_status}</td>
                <td>${item.Booked_Create_Date}</td>
                <td>${item.Exe_Date}</td>
            </tr>
        `);
    });
}

// Function to update modal table
function updateScanBagItemsTable(data) {
    if (!data) {
        $("#scanned-bag-items-table tbody").html('<tr><td colspan="3">No records found</td></tr>');
        return;
    }
    if (data.length === 0) {
        $("#scanned-bag-items-table tbody").html('<tr><td colspan="3">No records found</td></tr>');
        return;
    }
    if (data.length >= 1) {
        $(".scanned-bag-item-title").text(`Articles in ${data[0].Bag_ID}`);
    }

    let tbody = $("#scanned-bag-items-table tbody");
    tbody.empty();

    if (data.length === 0) {
        tbody.append("<tr><td colspan='3'>No records found</td></tr>");
        return;
    }

    data.forEach((item, index) => {
        let _status = item.Delivery_Status;
        if (_status == "Del_To_Rec") {
            _status = "Delivered";
        }
        else if (_status == "Ret_To_Sen") {
            _status = "Returned";
        } else if (_status == "Landed") {
            _status = "Received";
        }
        tbody.append(`
            <tr class="scan-bag-article-row" article_id="${item.Item_Bag_ID}">
                <td>${index + 1}</td>
                <td>${item.Item_Bag_ID}</td>
                <td>${_status}</td>
                <td>${item.Booked_Create_Date}</td>
                <td>${item.Exe_Date}</td>
            </tr>
        `);
    });
}

// Function to close modal
function closeAddBagModal() {
    $("#receive-bag-backdrop").hide();
}

// Function to close modal
function closeBagItemsModal() {
    $("#bag-items-backdrop").hide();
}


// Function to open article details modal
function openArticleDetailsModal(articleId) {
    $("#article-details-backdrop").show();
    $("#tracking-stepper").html('<p>Loading...</p>'); // Show loading state
    fetchArticleDetails(articleId);
}

// Function to open article details modal
function openReceiveBagModal() {
    $("#receive-bag-backdrop").show();
    $("#scan-bag-input").focus();
    // Fetch and populate the mail line options when modal opens
    fetchMailLineOptions();
}

// Function to fetch article details
function fetchArticleDetails(articleId) {
    let token = getCookie("access");
    // console.log("Access token:", token);
    let url = `${API_GET_URL}/v1/dms-legacy-core-logs/get-bag-item-detail/?item_id=${articleId}`;

    $.ajax({
        url: url,
        type: "GET",
        headers: { "Authorization": `Bearer ${token}` },
        success: function (response) {
            // console.log("Article details fetched:", response);
            updateArticleDetailsModal(response);
        },
        error: function (e) {
            console.error("Error fetching article details", e);
            $("#tracking-stepper").html('<p>Failed to load data</p>');
        }
    });
}

// // Function to update modal content
// function updateArticleDetailsModal(data) {
//     let details = data.article_details;
//     let trackingLogs = data.tracking_logs;

//     $("#article-item-id").text(details.Item_ID);
//     $("#article-item-type").text(details.Item_Type);
//     $("#article-vas-type").text(details.VAS_Type);

//     // Check if optional fields should be displayed
//     if (details.ben_name !== "0" || details.sen_name !== "0") {
//         $("#optional-fields").show();
//         $("#article-sen-name").text(details.sen_name);
//         $("#article-sen-address").text(details.sen_address);
//         $("#article-ben-name").text(details.ben_name);
//         $("#article-ben-address").text(details.ben_address);
//         $("#article-sen-contact").text(details.Sen_Contact);
//         $("#article-status").text(details.Status_Item);
//         $("#article-total-weight").text(`${details.Total_Weight} ${details.Unit_Weight}`);
//         $("#article-total-charge").text(`৳ ${details.Total_Charge}`);
//     } else {
//         $("#optional-fields").hide();
//     }

//     // Construct vertical stepper
//     let stepperHtml = trackingLogs.map(log => `
//         <div class="step">
//             <div class="step-circle"></div>
//             <div class="step-content">
//                 <p><strong>${log.Status}</strong></p>
//                 <p>${log.Remarks}</p>
//                 <p><small>${log.Event_Date} ${log.Event_Time}</small></p>
//                 <p><small>${log.Branch_Info}</small></p>
//             </div>
//         </div>
//     `).join("");

//     $("#tracking-stepper").html(stepperHtml);
// }

// Function to update modal content with table instead of stepper
function updateArticleDetailsModal(data) {
    let details = data.article_details;
    let trackingLogs = data.tracking_logs;

    $("#article-item-id").text(details.Item_ID);
    $("#article-item-type").text(details.Item_Type);
    $("#article-vas-type").text(details.VAS_Type);

    // Check if optional fields should be displayed
    if (details.ben_name !== "0" || details.sen_name !== "0") {
        $("#optional-fields").show();
        $("#article-sen-name").text(details.sen_name);
        $("#article-sen-address").text(details.sen_address);
        $("#article-ben-name").text(details.ben_name);
        $("#article-ben-address").text(details.ben_address);
        $("#article-sen-contact").text(details.Sen_Contact);
        $("#article-status").text(details.Status_Item);
        $("#article-total-weight").text(`${details.Total_Weight} ${details.Unit_Weight}`);
        $("#article-total-charge").text(`৳ ${details.Total_Charge}`);
    } else {
        $("#optional-fields").hide();
    }

    // Construct table rows for tracking history
    let tableHtml = `
        <table class="pm_table_style">
            <thead>
                <tr>
                    <th>Status</th>
                    <th>Remarks</th>
                    <th>Event Date</th>
                    <th>Event Time</th>
                    <th>Branch Info</th>
                </tr>
            </thead>
            <tbody>
                ${trackingLogs.map(log => `
                    <tr>
                        <td><strong>${log.Status}</strong></td>
                        <td>${log.Remarks}</td>
                        <td>${log.Event_Date}</td>
                        <td>${log.Event_Time}</td>
                        <td>${log.Branch_Info}</td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;

    // Insert the table into the modal
    $("#tracking-table-container").html(tableHtml);
}


// Function to close article details modal
function closeArticleDetailsModal() {
    $("#article-details-backdrop").hide();
}

// function updateBagPagination(currentPage, totalRecords, perPage) {
//     let totalPages = Math.ceil(totalRecords / perPage);
//     let paginationContainer = $("#bag-pagination");

//     document.getElementById("total_bags").innerText = `Total Bags : ${totalRecords}`;

//     // Select the correct per_page option in the dropdown
//     $("#bag_per_page").val(perPage);

//     // Ensure UI reflects the selection
//     $("#bag_per_page").trigger("change");

//     // Clear existing pagination buttons
//     paginationContainer.find(".bag-pagination-btn, .pos-pagination-dots").remove();
//     console.log("Total pages:", totalPages);
//     console.log("Current page:", currentPage);
//     console.log("Total records:", totalRecords);

//     let paginationHtml = '';

//     if (totalPages <= 6) {
//         // Show all pages if 6 or less
//         for (let i = 1; i <= totalPages; i++) {
//             paginationHtml += `<button class="bag-pagination-btn ${i == currentPage ? 'page-active' : ''}" data-page="${i}">${i}</button>`;
//         }
//     } else {
//         // First 4 pages
//         for (let i = 1; i <= 4; i++) {
//             paginationHtml += `<button class="bag-pagination-btn ${i == currentPage ? 'page-active' : ''}" data-page="${i}">${i}</button>`;
//         }

//         if (currentPage > 4 && currentPage < totalPages - 2) {
//             paginationHtml += `<span class="pos-pagination-dots">...</span>`;
//             paginationHtml += `<button class="bag-pagination-btn page-active" data-page="${currentPage}">${currentPage}</button>`;
//         } else {
//             paginationHtml += `<span class="pos-pagination-dots">...</span>`;
//         }

//         // Last 2 pages
//         paginationHtml += `<button class="bag-pagination-btn ${totalPages - 1 == currentPage ? 'page-active' : ''}" data-page="${totalPages - 1}">${totalPages - 1}</button>`;
//         paginationHtml += `<button class="bag-pagination-btn ${totalPages == currentPage ? 'page-active' : ''}" data-page="${totalPages}">${totalPages}</button>`;
//     }

//     // Append buttons before the next arrow
//     $("#nextBagPage").before(paginationHtml);

//     // **Remove previous event handlers before adding new ones**
//     $(document).off("click", "#nextBagPage");

//     // Add click event listener to pagination buttons
//     $(document).on("click", ".bag-pagination-btn", function () {
//         let token = getCookie("access");
//         console.log("Access token:", token);

//         let newPage = parseInt($(this).attr("data-page"));
//         queryParams.page = newPage;

//         fetchBags(token, queryParams);
//     });

//     // Disable prev/next buttons if necessary
//     $("#prevPage").prop("disabled", currentPage === 1);
//     $("#nextPage").prop("disabled", currentPage === totalPages);
// }



// function updateBagItemPagination(currentPage, totalRecords, perPage) {
//     let totalPages = Math.ceil(totalRecords / perPage);
//     let paginationContainer = $("#scan-bag-item-pagination");

//     document.getElementById("total_scanned_bag_items").innerText = `Total Bag Items : ${totalRecords}`;

//     // Select the correct per_page option in the dropdown
//     $("#scabag_per_page").val(perPage);

//     // Ensure UI reflects the selection
//     $("#bag_per_page").trigger("change");

//     // Clear existing pagination buttons
//     paginationContainer.find(".bag-pagination-btn, .pos-pagination-dots").remove();
//     console.log("Total pages:", totalPages);
//     console.log("Current page:", currentPage);
//     console.log("Total records:", totalRecords);

//     let paginationHtml = '';

//     if (totalPages <= 6) {
//         // Show all pages if 6 or less
//         for (let i = 1; i <= totalPages; i++) {
//             paginationHtml += `<button class="bag-pagination-btn ${i == currentPage ? 'page-active' : ''}" data-page="${i}">${i}</button>`;
//         }
//     } else {
//         // First 4 pages
//         for (let i = 1; i <= 4; i++) {
//             paginationHtml += `<button class="bag-pagination-btn ${i == currentPage ? 'page-active' : ''}" data-page="${i}">${i}</button>`;
//         }

//         if (currentPage > 4 && currentPage < totalPages - 2) {
//             paginationHtml += `<span class="pos-pagination-dots">...</span>`;
//             paginationHtml += `<button class="bag-pagination-btn page-active" data-page="${currentPage}">${currentPage}</button>`;
//         } else {
//             paginationHtml += `<span class="pos-pagination-dots">...</span>`;
//         }

//         // Last 2 pages
//         paginationHtml += `<button class="bag-pagination-btn ${totalPages - 1 == currentPage ? 'page-active' : ''}" data-page="${totalPages - 1}">${totalPages - 1}</button>`;
//         paginationHtml += `<button class="bag-pagination-btn ${totalPages == currentPage ? 'page-active' : ''}" data-page="${totalPages}">${totalPages}</button>`;
//     }

//     // Append buttons before the next arrow
//     $("#nextBagPage").before(paginationHtml);

//     // **Remove previous event handlers before adding new ones**
//     $(document).off("click", "#nextBagPage");

//     // Add click event listener to pagination buttons
//     $(document).on("click", ".bag-pagination-btn", function () {
//         let token = getCookie("access");
//         console.log("Access token:", token);

//         let newPage = parseInt($(this).attr("data-page"));
//         queryParams.page = newPage;

//         fetchBags(token, queryParams);
//     });

//     // Disable prev/next buttons if necessary
//     $("#prevPage").prop("disabled", currentPage === 1);
//     $("#nextPage").prop("disabled", currentPage === totalPages);
// }

function updatePagination(tableId, paginationContainerId, currentPage, totalRecords, perPage, fetchFunction) {
    let totalPages = Math.ceil(totalRecords / perPage);
    let paginationContainer = $("#" + paginationContainerId);

    if (!paginationContainer.length) {
        console.warn(`Pagination container '${paginationContainerId}' not found.`);
        return;
    }

    let totalElement = document.getElementById(`${tableId}_total`);
    if (totalElement) {
        totalElement.innerText = `Total Records: ${totalRecords}`;
    }

    // console.log("Total pages:", totalPages);
    // console.log("Current page:", currentPage);
    // console.log("Total records:", totalRecords);

    // ✅ Safely get arrows or create them if missing
    let prevArrow = paginationContainer.find(".pos-pagination-arrow-prev").prop("outerHTML") ||
        `<button class="pos-pagination-arrow pos-pagination-arrow-prev" aria-label="Previous Page" id="prev${tableId}Page">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                        </svg>
                    </button>`;

    let nextArrow = paginationContainer.find(".pos-pagination-arrow-next").prop("outerHTML") ||
        `<button class="pos-pagination-arrow pos-pagination-arrow-next" aria-label="Next Page" id="next${tableId}Page">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5 15.75 12l-7.5 7.5" />
                        </svg>
                    </button>`;

    // Remove only pagination numbers and dots, keeping arrows intact
    paginationContainer.find(".pos-pagination-btn, .pos-pagination-dots").remove();

    let paginationHtml = '';

    if (totalPages <= 6) {
        for (let i = 1; i <= totalPages; i++) {
            paginationHtml += `<button class="pos-pagination-btn ${i == currentPage ? 'page-active' : ''}" data-page="${i}">${i}</button>`;
        }
    } else {
        for (let i = 1; i <= 3; i++) {
            paginationHtml += `<button class="pos-pagination-btn ${i == currentPage ? 'page-active' : ''}" data-page="${i}">${i}</button>`;
        }

        if (currentPage > 3 && currentPage < totalPages - 2) {
            paginationHtml += `<span class="pos-pagination-dots">...</span>`;
            paginationHtml += `<button class="pos-pagination-btn page-active" data-page="${currentPage}">${currentPage}</button>`;
        } else {
            paginationHtml += `<span class="pos-pagination-dots">...</span>`;
        }

        paginationHtml += `<button class="pos-pagination-btn ${totalPages - 1 == currentPage ? 'page-active' : ''}" data-page="${totalPages - 1}">${totalPages - 1}</button>`;
        paginationHtml += `<button class="pos-pagination-btn ${totalPages == currentPage ? 'page-active' : ''}" data-page="${totalPages}">${totalPages}</button>`;
    }

    // ✅ Reinsert arrows and pagination buttons
    paginationContainer.html(prevArrow + paginationHtml + nextArrow);

    // Remove previous event handlers before adding new ones
    $(document).off("click", `#${paginationContainerId} .pos-pagination-btn`);

    // Add click event listener for pagination
    $(document).on("click", `#${paginationContainerId} .pos-pagination-btn`, function () {
        let token = getCookie("access");
        // console.log("Access token:", token);
        // console.log("queryParams:", queryParams);
        let newPage = parseInt($(this).attr("data-page"));
        if (tableId == "scanned-bag-items-table") {
            bagItemQueryParams.page = newPage;
            let _bag_id = $("#bag-detail-id").text();
            bagItemQueryParams.bag_id = _bag_id;
            fetchFunction(token, bagItemQueryParams);
        } else {
            queryParams.page = newPage
            fetchFunction(token, queryParams);
        }


    });


    // Remove previous event handlers before adding new ones
    $(document).off("click", `#${paginationContainerId} .pos-pagination-arrow-prev`);
    // Add click event listener for pagination
    $(document).on("click", `#${paginationContainerId} .pos-pagination-arrow-prev`, function () {
        if (currentPage === 1) return;
        let token = getCookie("access");
        // console.log("Access token:", token);

        if (tableId == "scanned-bag-items-table") {
            bagItemQueryParams.page = bagItemQueryParams.page - 1;
            fetchFunction(token, bagItemQueryParams);
        } else {
            queryParams.page = queryParams.page - 1;
            fetchFunction(token, queryParams);
        }

    });

    $(document).off("click", `#${paginationContainerId} .pos-pagination-arrow-next`);

    // Add click event listener for pagination
    $(document).on("click", `#${paginationContainerId} .pos-pagination-arrow-next`, function () {
        if (currentPage === totalPages) return
        let token = getCookie("access");
        // console.log("Access token:", token);
        if (tableId == "scanned-bag-items-table") {
            bagItemQueryParams.page = bagItemQueryParams.page + 1;
            fetchFunction(token, bagItemQueryParams);
        } else {
            queryParams.page = queryParams.page + 1;
            fetchFunction(token, queryParams);
        }

    });



    let prevArrowElement = $(`#${paginationContainerId} .pos-pagination-arrow-prev`);
    let nextArrowElement = $(`#${paginationContainerId} .pos-pagination-arrow-next`);

    if (prevArrowElement.length) prevArrowElement.prop("disabled", currentPage === 1);
    if (nextArrowElement.length) nextArrowElement.prop("disabled", currentPage === totalPages);
}


// Function to fetch mail line options from API and populate the select dropdown
function fetchMailLineOptions() {
    let token = getCookie("access");
    // console.log("Access token:", token);
    $.ajax({
        url: `${API_GET_URL}/v1/dms-legacy-core-logs/get-line-list/`,
        method: "GET",
        dataType: "json",
        headers: { "Authorization": `Bearer ${token}` },
        success: function (response) {
            if (response.data && response.data.length > 0) {
                let select = $("#custom-select");
                select.empty(); // Clear previous options

                response.data.forEach(item => {
                    let optionText = `${item.Category}: ${item.Name} ${item.Caption}`;
                    let optionValue = `${item.ID}`; // You can customize this if needed

                    select.append(`<option value="${optionValue}">${optionText}</option>`);
                });
            }
        },
        error: function (xhr, status, error) {
            console.error("Error fetching mail line options:", error);
        }
    });
}

// Function to receive selected articles
function receiveSelectedArticles() {
    if (selectedArticles.size === 0) {
        alert("No articles selected.");
        return;
    }
    alert(`Receiving articles: ${Array.from(selectedArticles)}`);
    return
    let selectedArticles = [];

    $("#scanned-bag-items-table tbody tr.selected").each(function () {
        let articleID = $(this).attr("article_id");
        let status = $(this).find("td:nth-child(3)").text(); // Getting status column

        // Ensure correct formatting for API
        selectedArticles.push(`${articleID}<>${status}`);
    });

    if (selectedArticles.length === 0) {
        alert("No articles selected.");
        return;
    }

    let bagID = $("#scan-bag-input").val(); // Assuming scanned bag input contains bag ID

    let requestData = {
        item_info: selectedArticles,
        bag_id: bagID
    };

    // $.ajax({
    //     url: "http://localhost:8002/v1/dms-legacy-core-logs/receive_bag_article",
    //     type: "POST",
    //     contentType: "application/json",
    //     data: JSON.stringify(requestData),
    //     success: function (response) {
    //         console.log("Articles received:", response);
    //         alert("Articles received successfully!");

    //         // Update table or UI if needed
    //         fetchScannedBagItems(); // Refresh items
    //     },
    //     error: function (error) {
    //         console.error("Error receiving articles:", error);
    //         alert("Failed to receive articles.");
    //     }
    // });
}


// Function to receive all bags
function receiveAllBagItems() {
    let bag_id = $("#scan-bag-input").val(); // Assuming scanned bag input contains bag ID
    if (!bag_id) {
        alert("Please scan a bag first.");
        return;
    }
    let total_items = $("#scanned-bag-items-table_total").text();
    let total = total_items.split(":")[1].trim();
    if (total == 0) {
        alert("No items available.");
        return;
    }
    alert(`Receiving ${total} articles in bag: ${bag_id}`);
    let selectedMailLine = $("#custom-select").val(); // Get selected mail line

    let scannedBags = [];
    $("#scanned-bag-items-table tbody tr").each(function () {
        let bagID = $(this).attr("article_id");
        // let marking = $(this).find("td:nth-child(3)").text(); // Assuming status is in column 3
        let marking = "0"; // Default marking
        if (!marking) marking = "0"; // Default marking

        scannedBags.push(`${bagID}<>${marking}`);
    });

    if (scannedBags.length === 0) {
        alert("No bags available.");
        return;
    }

    let requestData = {
        bag_id: scannedBags,
        mail_line_code: selectedMailLine
    };

    // $.ajax({
    //     url: "http://localhost:8002/v1/dms-legacy-core-logs/receive_bag",
    //     type: "POST",
    //     contentType: "application/json",
    //     data: JSON.stringify(requestData),
    //     success: function (response) {
    //         console.log("All bags received:", response);
    //         alert("All bags received successfully!");

    //         // Update UI or reset modal
    //         $("#receive-bag-backdrop").hide();
    //     },
    //     error: function (error) {
    //         console.error("Error receiving all bags:", error);
    //         alert("Failed to receive all bags.");
    //     }
    // });
}




