import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
      import {
        getFirestore,
        collection,
        addDoc,
        onSnapshot,
        doc,
        updateDoc,
        arrayUnion,
        arrayRemove,
        serverTimestamp,
      } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
      import {
        getAuth,
        signInWithPopup,
        GoogleAuthProvider,
        signOut,
        onAuthStateChanged,
      } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

      // FIREBASE CONFIG
      const firebaseConfig = {
        apiKey: "AIzaSyC_VyCZS1moWn62VPJP3BNF2og5FVtE0zM",
        authDomain: "opstina-ohrid.firebaseapp.com",
        projectId: "opstina-ohrid",
        storageBucket: "opstina-ohrid.firebasestorage.app",
        messagingSenderId: "414635327032",
        appId: "1:414635327032:web:804edb9e330500f9c4b0cd",
      };

      const app = initializeApp(firebaseConfig);
      const db = getFirestore(app);
      const auth = getAuth(app);
      const provider = new GoogleAuthProvider();

      // Admin list (replace with your Google email)
      const adminEmails = [
        "damjannikoloski.20@gmail.com"
      ];

      let currentUser = null;
      let issues = [];
      let activeCategory = "all";
      let activeStatus = "all";
      let searchQuery = "";
      let currentSort = "newest";

      const authBar = document.getElementById("auth-bar");
      const issuesContainer = document.getElementById("issues-container");
      const searchInput = document.getElementById("search-input");
      const sortSelect = document.getElementById("sort-select");
      const modalCreate = document.getElementById("modal-create");
      const modalDetails = document.getElementById("modal-details");

      const categoryNames = {
        улици: "Streets & Roads",
        осветлување: "Public Lighting",
        хигиена: "Trash & Hygiene",
        паркови: "Parks & Greenery",
        вода: "Water & Sewerage",
        останато: "Other",
      };

      const statusNames = {
        new: "New",
        in_progress: "In Progress",
        resolved: "Resolved",
      };

      // AUTHENTICATION
      onAuthStateChanged(auth, (user) => {
        currentUser = user;
        renderAuthUI();
        renderIssues();
      });

      function renderAuthUI() {
        if (currentUser) {
          const isAdmin = adminEmails.includes(currentUser.email);

          authBar.innerHTML = `
                    ${
                      isAdmin
                        ? `
                        <a href="admin.html" class="btn btn-outline" style="border-color: #38bdf8; color: #38bdf8; text-decoration: none;">
                            <i class="fa-solid fa-user-shield"></i> Admin
                        </a>
                    `
                        : ""
                    }
                    <div class="user-chip">
                        <img src="${currentUser.photoURL || "https://i.pravatar.cc/100"}" class="user-avatar" alt="Avatar">
                        <span class="user-name">${currentUser.displayName || "User"}</span>
                    </div>
                    <button class="btn btn-outline" id="btn-logout" title="Sign Out">
                        <i class="fa-solid fa-right-from-bracket"></i>
                    </button>
                `;
          document
            .getElementById("btn-logout")
            .addEventListener("click", () => signOut(auth));
        } else {
          authBar.innerHTML = `
                    <button class="btn btn-primary" id="btn-login">
                        <i class="fa-brands fa-google"></i> Sign In
                    </button>
                `;
          document
            .getElementById("btn-login")
            .addEventListener("click", () => signInWithPopup(auth, provider));
        }
      }

      // REALTIME FIRESTORE LISTENER
      const issuesRef = collection(db, "issues");
      onSnapshot(issuesRef, (snapshot) => {
        issues = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          issues.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate()
              ? data.createdAt.toDate().toISOString()
              : new Date().toISOString(),
          });
        });
        updateStats();
        renderIssues();
      });

      function updateStats() {
        const total = issues.length;
        const resolved = issues.filter((i) => i.status === "resolved").length;
        const progress = issues.filter(
          (i) => i.status === "in_progress",
        ).length;

        document.getElementById("stat-total").innerText = total;
        document.getElementById("stat-resolved").innerText = resolved;
        document.getElementById("stat-progress").innerText = progress;

        document.getElementById("count-cat-all").innerText = total;
        Object.keys(categoryNames).forEach((cat) => {
          const count = issues.filter((i) => i.category === cat).length;
          const el = document.getElementById(`count-cat-${cat}`);
          if (el) el.innerText = count;
        });
      }

      function renderIssues() {
        let filtered = [...issues];

        if (activeCategory !== "all")
          filtered = filtered.filter((i) => i.category === activeCategory);
        if (activeStatus !== "all")
          filtered = filtered.filter((i) => i.status === activeStatus);

        if (searchQuery.trim() !== "") {
          const q = searchQuery.toLowerCase();
          filtered = filtered.filter(
            (i) =>
              i.title.toLowerCase().includes(q) ||
              i.description.toLowerCase().includes(q) ||
              i.location.toLowerCase().includes(q),
          );
        }

        filtered.sort((a, b) => {
          if (currentSort === "newest")
            return new Date(b.createdAt) - new Date(a.createdAt);
          if (currentSort === "oldest")
            return new Date(a.createdAt) - new Date(b.createdAt);
          if (currentSort === "votes")
            return (b.votes?.length || 0) - (a.votes?.length || 0);
          return 0;
        });

        if (filtered.length === 0) {
          issuesContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fa-solid fa-folder-open"></i>
                        <h3>No issues found</h3>
                        <p>Be the first to report an issue in this category.</p>
                    </div>
                `;
          return;
        }

        issuesContainer.innerHTML = filtered
          .map((issue) => {
            const voteCount = issue.votes ? issue.votes.length : 0;
            const hasVoted =
              currentUser &&
              issue.votes &&
              issue.votes.includes(currentUser.uid);

            return `
                    <div class="issue-card" data-id="${issue.id}">
                        <div class="upvote-box ${hasVoted ? "voted" : ""}" onclick="window.toggleVote('${issue.id}')">
                            <i class="fa-solid fa-chevron-up"></i>
                            <span class="upvote-count">${voteCount}</span>
                        </div>
                        <div class="issue-content">
                            <div class="issue-meta-top">
                                <span class="badge badge-status-${issue.status}">
                                    ${statusNames[issue.status] || issue.status}
                                </span>
                                <span class="badge badge-category">
                                    ${categoryNames[issue.category] || issue.category}
                                </span>
                                <span class="issue-time">
                                    <i class="fa-regular fa-clock"></i> ${formatDate(issue.createdAt)}
                                </span>
                            </div>
                            <h3 class="issue-title" onclick="window.openDetailModal('${issue.id}')">${escapeHtml(issue.title)}</h3>
                            <p class="issue-desc">${escapeHtml(issue.description)}</p>
                            <div class="issue-location">
                                <i class="fa-solid fa-location-dot" style="color:var(--accent);"></i>
                                <span>${escapeHtml(issue.location)}</span>
                            </div>
                            ${issue.imageUrl ? `<img src="${escapeHtml(issue.imageUrl)}" class="issue-image-preview" alt="Illustration">` : ""}
                        </div>
                    </div>
                `;
          })
          .join("");
      }

      // VOTE HANDLER
      window.toggleVote = async (issueId) => {
        if (!currentUser) {
          alert("Please sign in to vote!");
          signInWithPopup(auth, provider);
          return;
        }

        const issue = issues.find((i) => i.id === issueId);
        if (!issue) return;

        const userUid = currentUser.uid;
        const hasVoted = issue.votes && issue.votes.includes(userUid);
        const docRef = doc(db, "issues", issueId);

        if (hasVoted) {
          await updateDoc(docRef, { votes: arrayRemove(userUid) });
        } else {
          await updateDoc(docRef, { votes: arrayUnion(userUid) });
        }
      };

      // IMAGE UPLOAD (компјутер / галерија / камера)
      function fileToCompressedDataURL(file, maxSize = 900, quality = 0.7) {
        return new Promise((resolve, reject) => {
          const img = new Image();
          const url = URL.createObjectURL(file);
          img.onload = () => {
            const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
            const w = Math.round(img.width * scale);
            const h = Math.round(img.height * scale);
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            canvas.getContext("2d").drawImage(img, 0, 0, w, h);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL("image/jpeg", quality));
          };
          img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Invalid image"));
          };
          img.src = url;
        });
      }

      const imageInput = document.getElementById("issue-image-input");
      const imagePreview = document.getElementById("image-preview");

      imageInput.addEventListener("change", () => {
        const file = imageInput.files[0];
        if (file) {
          imagePreview.src = URL.createObjectURL(file);
          imagePreview.style.display = "block";
        } else {
          imagePreview.style.display = "none";
        }
      });

      // CREATE NEW ISSUE
      document
        .getElementById("form-create-issue")
        .addEventListener("submit", async (e) => {
          e.preventDefault();

          if (!currentUser) {
            alert("You must be signed in to submit an issue.");
            signInWithPopup(auth, provider);
            return;
          }

          const title = document.getElementById("issue-title-input").value;
          const category = document.getElementById(
            "issue-category-input",
          ).value;
          const location = document.getElementById(
            "issue-location-input",
          ).value;
          const file = imageInput.files[0];
          const description = document.getElementById("issue-desc-input").value;

          const submitBtn = document.getElementById("btn-submit-issue");
          submitBtn.disabled = true;

          try {
            let imageUrl = "";
            if (file) {
              imageUrl = await fileToCompressedDataURL(file);
            }

            await addDoc(collection(db, "issues"), {
              title,
              category,
              location,
              imageUrl,
              description,
              status: "new",
              votes: [currentUser.uid],
              createdAt: serverTimestamp(),
              userId: currentUser.uid,
              userName: currentUser.displayName || "Anonymous",
              userPhoto: currentUser.photoURL || "",
            });

            closeModals();
            document.getElementById("form-create-issue").reset();
            imagePreview.style.display = "none";
          } catch (err) {
            console.error(err);
            alert("Не успеа испраќањето. Обиди се повторно.");
          } finally {
            submitBtn.disabled = false;
          }
        });

      // DETAIL MODAL
      window.openDetailModal = (issueId) => {
        const issue = issues.find((i) => i.id === issueId);
        if (!issue) return;

        document.getElementById("modal-detail-title").innerText = issue.title;

        const detailBody = document.getElementById("modal-detail-body");
        detailBody.innerHTML = `
                <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
                    <span class="badge badge-status-${issue.status}">${statusNames[issue.status] || issue.status}</span>
                    <span class="badge badge-category">${categoryNames[issue.category] || issue.category}</span>
                </div>
                <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1rem;">
                    <i class="fa-solid fa-location-dot"></i> ${escapeHtml(issue.location)} &bull; 
                    <i class="fa-regular fa-clock"></i> ${formatDate(issue.createdAt)}
                </div>
                <p style="font-size: 1rem; line-height: 1.6; color: var(--text-main); margin-bottom: 1.5rem;">
                    ${escapeHtml(issue.description)}
                </p>
                ${issue.imageUrl ? `<img src="${escapeHtml(issue.imageUrl)}" style="width: 100%; max-height: 350px; object-fit: cover; border-radius: 12px; margin-bottom: 1.5rem;" alt="Attached image">` : ""}
                <div style="background: var(--bg-main); padding: 1rem; border-radius: 10px; display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <img src="${issue.userPhoto || "https://i.pravatar.cc/100"}" style="width: 36px; height: 36px; border-radius: 50%;" alt="User">
                        <div>
                            <div style="font-weight: 700; font-size: 0.875rem;">Reported by: ${escapeHtml(issue.userName || "Citizen")}</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">Supported by ${issue.votes ? issue.votes.length : 0} citizens</div>
                        </div>
                    </div>
                    <button class="btn btn-primary" onclick="window.toggleVote('${issue.id}'); window.openDetailModal('${issue.id}');">
                        <i class="fa-solid fa-thumbs-up"></i> Support
                    </button>
                </div>
            `;

        modalDetails.classList.add("active");
      };

      // EVENT LISTENERS
      document
        .getElementById("category-filters")
        .addEventListener("click", (e) => {
          const btn = e.target.closest(".filter-btn");
          if (!btn) return;
          document
            .querySelectorAll("#category-filters .filter-btn")
            .forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          activeCategory = btn.getAttribute("data-cat");
          renderIssues();
        });

      document
        .getElementById("status-filters")
        .addEventListener("click", (e) => {
          const btn = e.target.closest(".filter-btn");
          if (!btn) return;
          document
            .querySelectorAll("#status-filters .filter-btn")
            .forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          activeStatus = btn.getAttribute("data-status");
          renderIssues();
        });

      searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value;
        renderIssues();
      });

      sortSelect.addEventListener("change", (e) => {
        currentSort = e.target.value;
        renderIssues();
      });

      document
        .getElementById("btn-open-create")
        .addEventListener("click", () => {
          if (!currentUser) {
            alert("Please sign in with Google to report an issue.");
            signInWithPopup(auth, provider);
            return;
          }
          modalCreate.classList.add("active");
        });

      document.querySelectorAll(".btn-close-modal").forEach((btn) => {
        btn.addEventListener("click", closeModals);
      });

      window.addEventListener("click", (e) => {
        if (e.target === modalCreate || e.target === modalDetails) {
          closeModals();
        }
      });

      function closeModals() {
        modalCreate.classList.remove("active");
        modalDetails.classList.remove("active");
      }

      function formatDate(dateString) {
        if (!dateString) return "Recently";
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return "Recently";
        return date.toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      }

      function escapeHtml(str) {
        if (!str) return "";
        return str.replace(
          /[&<>"']/g,
          (m) =>
            ({
              "&": "&amp;",
              "<": "&lt;",
              ">": "&gt;",
              '"': "&quot;",
              "'": "&#039;",
            })[m],
        );
      }

      // ZOOM НА СЛИКА (клик за цела слика)
const zoomStyle = document.createElement("style");
zoomStyle.textContent = `
  .issue-image-preview,
  #modal-detail-body img[alt="Attached image"] { cursor: zoom-in; }
  #image-lightbox {
    position: fixed; inset: 0; z-index: 10000;
    background: rgba(0, 0, 0, 0.9);
    display: none; align-items: center; justify-content: center;
    padding: 1rem; cursor: zoom-out;
  }
  #image-lightbox.active { display: flex; }
  #image-lightbox img {
    max-width: 100%; max-height: 100%;
    object-fit: contain; border-radius: 8px;
  }
  #image-lightbox .lightbox-close {
    position: absolute; top: 1rem; right: 1.25rem;
    color: #fff; font-size: 2rem; line-height: 1;
  }
`;
document.head.appendChild(zoomStyle);

const lightbox = document.createElement("div");
lightbox.id = "image-lightbox";
lightbox.innerHTML = `<span class="lightbox-close">&times;</span><img alt="Full image" />`;
document.body.appendChild(lightbox);
const lightboxImg = lightbox.querySelector("img");

document.addEventListener("click", (e) => {
  const img = e.target.closest(
    '.issue-image-preview, #modal-detail-body img[alt="Attached image"]',
  );
  if (img) {
    lightboxImg.src = img.src;
    lightbox.classList.add("active");
  }
});

lightbox.addEventListener("click", () => lightbox.classList.remove("active"));

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") lightbox.classList.remove("active");
});