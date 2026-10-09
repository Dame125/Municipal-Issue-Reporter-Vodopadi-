 import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
      import {
        getFirestore,
        collection,
        onSnapshot,
        doc,
        deleteDoc,
        updateDoc
      } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

      // Firebase Config
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

      const tableBody = document.getElementById("admin-table-body");

      // Realtime listener
      onSnapshot(collection(db, "issues"), (snapshot) => {
        if (snapshot.empty) {
          tableBody.innerHTML = `
            <tr>
              <td colspan="6" style="text-align: center;">No active issues in the database.</td>
            </tr>`;
          return;
        }

        let html = "";
        snapshot.forEach((docSnap) => {
          const issue = docSnap.data();
          const id = docSnap.id;
          const voteCount = issue.votes ? issue.votes.length : 0;

          html += `
            <tr>
              <td>
                ${issue.imageUrl 
                  ? `<img src="${escapeHtml(issue.imageUrl)}" class="img-thumb" alt="Image">` 
                  : `<span style="color:var(--text-muted); font-size: 0.75rem;">None</span>`}
              </td>
              <td>
                <strong style="color: var(--primary);">${escapeHtml(issue.title)}</strong>
                <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.2rem;">
                  ${escapeHtml(issue.description)}
                </p>
              </td>
              <td>
                <div style="font-weight: 600;">${escapeHtml(issue.category)}</div>
                <div style="font-size: 0.8rem; color: var(--text-muted);"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(issue.location)}</div>
              </td>
              <td><strong>${voteCount}</strong></td>
              <td>
                <select class="status-select" onchange="window.changeStatus('${id}', this.value)">
                  <option value="new" ${issue.status === 'new' ? 'selected' : ''}>New</option>
                  <option value="in_progress" ${issue.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                  <option value="resolved" ${issue.status === 'resolved' ? 'selected' : ''}>Resolved</option>
                </select>
              </td>
              <td>
                <button class="btn-action btn-delete" onclick="window.deleteIssue('${id}')">
                  <i class="fa-solid fa-trash"></i> Delete
                </button>
              </td>
            </tr>
          `;
        });

        tableBody.innerHTML = html;
      });

      // Delete issue
      window.deleteIssue = async (id) => {
        if (confirm("Are you sure you want to delete this issue?")) {
          try {
            await deleteDoc(doc(db, "issues", id));
          } catch (err) {
            alert("Error deleting issue: " + err.message);
          }
        }
      };

      // Change status
      window.changeStatus = async (id, newStatus) => {
        try {
          await updateDoc(doc(db, "issues", id), {
            status: newStatus
          });
        } catch (err) {
          alert("Error updating status: " + err.message);
        }
      };

      function escapeHtml(str) {
        if (!str) return "";
        return str.replace(/[&<>"']/g, (m) => ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;",
        })[m]);
      }