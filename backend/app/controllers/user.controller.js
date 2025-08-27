exports.allAccess = (req, res) => {
  res.status(200).send(`App is now live! 🎉 \n
      - Support for Python and Java is coming soon. \n
      - Stay tuned for more updates.
    `);
};

exports.userBoard = (req, res) => {
  res.status(200).send("User Content.");
};

exports.adminBoard = (req, res) => {
  res.status(200).send("Admin Content.");
};