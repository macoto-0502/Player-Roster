require('dotenv').config(); // .env を読み込む
const mysql = require('mysql2');

console.log('DB_HOST:', process.env.DB_HOST);

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT, // Railwayではportも必要
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE
});

connection.connect((err) => {
  if (err) {
    console.error('DB接続エラー:', err);
    return;
  }
  console.log('DB接続成功');
});

const express = require('express');
const app = express();
const multer = require('multer');
const csv = require('csv-parser');
const iconv = require('iconv-lite');
const fs = require('fs');

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const upload = multer({ dest: 'uploads/' });    // アップロード先の設定（destは保存先の指定）

// const connection = mysql.createConnection({     // MySQL 接続
//     host: 'localhost',
//     user: 'root',
//     password: '',
//     database: 'basketball'
// });

app.post('/delete', (req, res) => {
    const { id, team_id } = req.body;

    connection.query(
        'DELETE FROM players WHERE id = ?',
        [id],
        (err, rows) => {
            if(err) {
                console.log(err);
                return res.semd("DBエラーが発生しました");
            }
            res.redirect(`/players/${team_id}`);
        }
    );
});

app.get('/top', (req, res) => {
    connection.query(
        'SELECT * FROM teams',
        (err, rows) => {
            if (err) {
                console.error(err);
                return res.send("DBエラーが発生しました");
            }
            res.render('top', { teams: rows });
        }
    );
});

app.get('/add', (req, res) => {
    res.render('add.ejs', {
        player: {
            jersey_number: "",
            name: "",
            height_cm: "",
            weight_kg: "",
            position: "",
            birthdate: "",
            birthplace: ""
        }
    });
});

app.get('/add/:teamId', (req, res) => {
    const teamId = req.params.teamId;

    res.render('add', {
        teamId,
        player: {
            jersey_number: "",
            name: "",
            height_cm: "",
            weight_kg: "",
            position: "",
            birthdate: "",
            birthplace: ""
        }
    });
});

app.post('/add', (req, res) => {

    const {
        jersey_number,
        name,
        height_cm,
        weight_kg,
        position,
        birthdate,
        birthplace,
        team_id
    } = req.body;

    connection.query(
        `INSERT INTO players(
            jersey_number,
            name,
            height_cm,
            weight_kg,
            position,
            birthdate,
            birthplace,
            team_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [jersey_number, name, height_cm, weight_kg, position, birthdate, birthplace, team_id],
        (err, result) => {
            if (err) {
                console.error(err);
                return res.send("追加エラーが発生しました");
            }

            // 挿入された選手のID
            const newPlayerId = result.insertId;

            // team_id は POST で受け取っているのでそのまま使える
            res.redirect(`/players/${team_id}`);
        }
    );
});


app.get('/signup', (req, res) => {  //ログイン画面
    res.render('signup');
});

app.get('/registration', (req, res) => {
    res.render('registration');
});

app.get('/players', (req, res) => {
    res.render('players');
});

app.get('/edit', (req, res) => {
    res.render('edit.ejs', {
        player: {
            jersey_number: "",
            name: "",
            height_cm: "",
            weight_kg: "",
            position: "",
            birthdate: "",
            birthplace: ""
        }
    });
});

app.get('/edit/:id', (req, res) => {
    const playerId = req.params.id;

    connection.query(
        'SELECT * FROM players WHERE id = ?',
        [playerId],
        (err, rows) => {
            if (err) {
                console.error(err);
                return res.send("DBエラーが発生しました");
            }
            const player = rows[0];
            res.render('edit.ejs', { player: player });
        }
    );
});

app.get('/download', (req, res) => {
    const filePath = __dirname + '/public/csv/teamDirectory.csv';
    res.download(filePath);
});

app.get('/account', (req, res) => {
    res.render('account.ejs', {
        h2: "ログインに使用するチーム名と<br>パスワードを入力してください"
    });
});

app.get('/new_acc', (req, res) =>{
    res.redirect('top');
})

app.post('/update', (req, res) => {
    const {
        id,
        jersey_number,
        name,
        height_cm,
        weight_kg,
        position,
        birthdate,
        birthplace
    } = req.body;

    connection.query(
        `UPDATE players SET
            jersey_number = ?,
            name = ?,
            height_cm = ?,
            weight_kg = ?,
            position = ?,
            birthdate = ?,
            birthplace = ?
         WHERE id = ?`,
        [jersey_number, name, height_cm, weight_kg, position, birthdate, birthplace, id],
        (err) => {
            if (err) {
                console.error(err);
                return res.send("更新エラーが発生しました");
            }

            // 更新後、選手の team_id を取得してそのチームページへリダイレクト
            connection.query(
                'SELECT team_id FROM players WHERE id = ?',
                [id],
                (err, rows) => {
                    if (err || rows.length === 0) {
                        console.error(err);
                        return res.redirect('/top');
                    }

                    const team_id = rows[0].team_id;
                    res.redirect(`/players/${team_id}`);
                }
            );
        }
    );
});

app.post('/insert', (req, res) => {
    connection.query(
        `INSERT players SET
            jersey_number = ?,
            name = ?,
            height_cm = ?,
            weight_kg = ?,
            position = ?,
            birthdate = ?,
            birthplace = ?
         WHERE id = ?`,
        [jersey_number, name, height_cm, weight_kg, position, birthdate, birthplace, id],
        (err) => {
            if (err) {
                console.error(err);
                return res.send("追加エラーが発生しました");
            }

            // 更新後、選手の team_id を取得してそのチームページへリダイレクト
            connection.query(
                'SELECT team_id FROM players WHERE id = ?',
                [id],
                (err, rows) => {
                    if (err || rows.length === 0) {
                        console.error(err);
                        return res.redirect('/top');
                    }

                    const teamId = rows[0].team_id;
                    res.redirect(`/players/${teamId}`);
                }
            );
        }
    )
});

app.get('/players/:id', (req, res) => {
    const teamId = req.params.id;

    connection.query(
        'SELECT * FROM players WHERE team_id = ?',
        [teamId],
        (err, playerRows) => {
            if (err) {
                console.error(err);
                return res.send("エラーが発生しました");
            }
            
            connection.query(
                'SELECT teamname FROM teams WHERE id = ?',
                [teamId],
                (err, teamRows) => {
                    if (err) {
                        console.error(err);
                        return res.send("チーム名取得エラー");
                    }

                    const teamname = teamRows[0]?.teamname || "チーム名不明";

                    res.render('players.ejs', {
                        players: playerRows,
                        teamname: teamname,
                        teamId: teamId
                    });
                }
            );

        }
    );
});

app.post('/new_acc', upload.single('csvfile'), (req, res) => {
        // [アカウントを作成] ボタン
    const teamname = req.body.teamname;
    const password = req.body.password;

    connection.query(
        'SELECT COUNT(*) AS cnt FROM teams WHERE teamname = ?',
        [teamname],
        (err, rows) => {

            if (rows[0].cnt > 0) {
                console.log("存在する");
                return res.render('account.ejs', {
                    h2: "そのチームネームは既に使用されています。"
                });
            }else{
                
                console.log("存在しない");
                
                connection.query(   // 新規登録処理
                'INSERT INTO teams (teamname, password) VALUES (?, ?)',
                [teamname, password],
                (err, results) => {

                    const newTeamId = results.insertId;     //新しいチームIDを取得。後にプレイヤーテーブルで使う
                    console.log("新しいチームID:", newTeamId);

                    const csvRows = [];

                    if (!req.file) {
                        return res.render('account.ejs', {
                            h2: "CSVファイルが選択されていません。"
                        });
                    }


                    fs.createReadStream(req.file.path)
                        .pipe(iconv.decodeStream('Shift_JIS'))  // ← ここでSJIS→UTF-8変換
                        .pipe(csv())
                        .on('data', (data) => csvRows.push(data))
                        .on('end', () => {
                            
                            const map = {
                                '背番号': 'jersey_number',
                                '氏名': 'name',
                                '身長(cm)': 'height_cm',
                                '体重(kg)': 'weight_kg',
                                'ポジション(PG,SG)': 'position',
                                '誕生日(2000-1-1)': 'birthdate',
                                '出身地': 'birthplace'
                            };

                            csvRows.forEach(row => {    // 1行ずつ DB に INSERT

                                const dbRow = {};

                                for (const key in map) {    // CSV のキーを DB のカラム名に変換
                                    dbRow[map[key]] = row[key];
                                }

                                connection.query(   // INSERT 実行

                                    `INSERT INTO players (jersey_number, name, height_cm, weight_kg, position, birthdate, birthplace, team_id)
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                                    [
                                        dbRow.jersey_number,
                                        dbRow.name,
                                        dbRow.height_cm,
                                        dbRow.weight_kg,
                                        dbRow.position,
                                        dbRow.birthdate,
                                        dbRow.birthplace,
                                        newTeamId
                                    ],
                                    (err) => {
                                        if (err) console.error(err);
                                    }
                                );
                            });
                            console.log("CSV → DB 取り込み完了");
                            res.redirect('/top');
                        });
                });          
            }
        }
    );
});




//app.listen(3000);

//Render用にapp.listen(3000);を書き換え
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

