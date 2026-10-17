/* RizSimulation — Insight to Implication | Activity 01
 * Reconstructed from the published faculty teaching note (16 October 2026).
 * Review and LT stems, keys, and keyed-option text follow the note.
 * Distractor option wording was not present in the note and is reconstructed.
 * This is a standalone educational reproduction, not an export of the deployed site's source.
 */
(function (root, make) {
  'use strict';
  const data = make();
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
  if (root) root.InsightData = data;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const options = (a,b,c,d) => ({A:a,B:b,C:c,D:d});
  return {
    id:'rizsimulation.insight-to-implication.bystander.v1',
    title:'Insight to Implication',
    topic:'The Bystander Effect',
    programme:'AI in Pedagogy · Teaching & Learning Symposium 2026',
    framework:['Knowledge Review','Learning Transfer','Knowledge Gain','Review Gain Analytics'],
    review:[
      {id:'K1',concept:'Responsibility',title:'Who owns the next step?',
        stem:'Several colleagues see a visitor asking for help. Each thinks another colleague will respond, so nobody does. Which explanation best fits?',
        options:options(
          'Responsibility feels spread across the people present.',
          'The visitor’s request is too unclear for anyone to interpret.',
          'Every colleague has already accepted a different urgent responsibility.',
          'The colleagues have agreed that the visitor requires no assistance.'
        ),key:'A',
        explanation:'Each observer expects someone else to act. Help was neither refused nor confirmed as already arranged.'},
      {id:'K2',concept:'Uncertainty',title:'Reading the room',
        stem:'At a workshop, a participant looks distressed. Others remain quiet. You are unsure whether help is needed. How can the group’s silence delay action?',
        options:options(
          'It proves the distressed participant would prefer not to receive help.',
          'It confirms that a responsible person has already provided assistance.',
          'It can make people mistake others’ silence for reassurance.',
          'It establishes that the original concern was only an imagined problem.'
        ),key:'C',
        explanation:'Silence may look reassuring when the need is unclear. It does not confirm that help is unwanted or underway.'},
      {id:'K3',concept:'Ownership',title:'A clear request for help',
        stem:'A group message asks for help with a stranded visitor. Many people read it, but no one responds. Which next message most directly addresses shared responsibility?',
        options:options(
          'Could somebody please assist the visitor when time becomes available?',
          '“Amina, please contact the help desk and confirm here.”',
          'Many people have seen this message; please read it again.',
          'Let us wait for someone nearby to volunteer independently soon.'
        ),key:'B',
        explanation:'A named person, task and confirmation clarify responsibility. Repeating a general request leaves the owner unclear.'},
      {id:'K4',concept:'Evidence',title:'What does a study show?',
        stem:'In a controlled study, people respond less often when they believe other witnesses are present than when they believe they are alone. What is the best conclusion?',
        options:options(
          'People never help if they think additional witnesses are present.',
          'Larger groups always demonstrate a stronger concern for other people.',
          'The experiment establishes the moral character of individual study participants.',
          'Other witnesses can reduce a person’s likelihood of helping.'
        ),key:'D',
        explanation:'The study supports a situational effect, not a universal claim about crowds or a judgment of moral character.'},
      {id:'K5',concept:'Boundary',title:'When a crowd helps',
        stem:'At a public event, several witnesses notice a clear problem and coordinate useful help. How does this fit the bystander effect?',
        options:options(
          'It completely disproves earlier research concerning help in group situations.',
          'It shows that group effects depend on clarity and support.',
          'It demonstrates that shared awareness removes every possible helping delay.',
          'It establishes that the number of witnesses alone predicts assistance.'
        ),key:'B',
        explanation:'Clear need and useful support can reduce delay. A group does not always inhibit helping.'},
      {id:'K6',concept:'Safe action',title:'Respond without unnecessary risk',
        stem:'You notice a possible safety problem in a busy hall. Many people are watching, but no one has acted. What is the most useful response?',
        options:options(
          'Wait until every observer agrees the situation needs urgent attention.',
          'Attempt an untrained physical intervention before alerting available support staff.',
          'Alert trained staff and ask one person to confirm contact.',
          'Request additional observers before deciding whether anyone should take action.'
        ),key:'C',
        explanation:'Seek trained support and confirm contact. The concept does not require a risky rescue or waiting for group agreement.'}
    ],
    source:{
      id:'LT-S',kind:'source',eyebrow:'Source case · A college event',title:'The unanswered request',
      stem:'A visitor at a college event says they feel faint and asks for assistance. Six staff members hear the request. Each knows how to contact the event help desk, but each assumes another staff member will call. No one calls. The visitor’s request is clear, and no task has been assigned.',
      prompt:'Which explanation best accounts for the delay?',
      options:options(
        'The visitor’s request was too unclear for the staff to understand.',
        'The event help desk had no established way to receive calls.',
        'Each staff member expects someone else to take responsibility.',
        'The staff deliberately agreed that the request deserved no response.'
      ), key:'C',
      explanation:'The request and the route to help are clear. The missing step is personal responsibility: each staff member assumes somebody else will call.'
    },
    transfer:{
      id:'LT-T',kind:'transfer',eyebrow:'Transfer case · A community delivery service',title:'A silent message group',
      stem:'A community delivery service uses a group chat. A driver sends a clear message: a resident needs urgent assistance at the building entrance. Several volunteers read it. Everyone knows how to contact the building coordinator, yet no one confirms doing so. You are the volunteer leading this shift.',
      prompt:'Which next step best applies the idea from the source case?',
      options:options(
        'Ask a named volunteer to contact the coordinator and confirm.',
        'Forward the request to a larger group without naming a responder.',
        'Wait until another volunteer independently offers to coordinate the response.',
        'Repeat the general request without specifying a person or task.'
      ),key:'A',
      explanation:'The setting changes, but the responsibility problem is similar. Naming a volunteer, giving a clear task and asking for confirmation addresses the gap. More readers alone may leave the gap unchanged.'
    },
    factualBridge:{
      heading:'Why noticing does not always become helping',
      lead:'When several people can respond, each may assume that someone else will act. This is diffusion of responsibility.',
      steps:[
        {heading:'Shared responsibility',text:'More witnesses can sometimes mean that each person feels less personally responsible.'},
        {heading:'Silence and uncertainty',text:'Where need is unclear, observers may interpret other people’s inaction as reassurance. Silence does not establish safety.'},
        {heading:'Clear, safe action',text:'Where appropriate, identify a responsible person, agree a safe action and confirm that the right help was contacted.'}
      ],
      note:'In the source case, the request and route to help are clear. The central issue is the absence of an individually owned action.'
    },
    refresher:{
      heading:'One concept to consolidate before Knowledge Gain',
      body:'Separate noticing from taking responsibility. Several people may understand a problem, yet nobody acts because each expects another person to do it. Adding more observers does not itself assign the task.',
      example:'A library group notices that a visitor needs assistance. Saying “someone should contact the librarian” leaves the task open. Saying “Bilal, please contact the librarian; I will stay with the visitor” gives people clear roles.'
    },
    feedback:{
      'II':{title:'Review the concept before continuing',short:'You need to revise the concept before proceeding to KG.',detail:'Both your source judgment and your transfer decision need further practice.',review:true},
      'IC':{title:'The idea became clearer at transfer',short:'Great, you have consolidated the concept; proceed to KG.',detail:'Your new-case decision addresses the responsibility gap. A correct transfer is promising, but one case is not proof of mastery.',review:false},
      'CC':{title:'You applied the idea consistently',short:'You are doing great; proceed to KG.',detail:'You selected the best-supported explanation and applied the idea to a new setting. Treat this as one learning snapshot.',review:false},
      'CI':{title:'Review how to apply the idea',short:'Your source judgment was correct, but the transfer needs another look.',detail:'Recognizing a mechanism and choosing an action are different tasks. Review the concept before proceeding to KG.',review:true}
    },
    sources:[
      'Darley & Latané (1968). Journal of Personality and Social Psychology, 8, 377–383. DOI:10.1037/h0025589',
      'Latané & Darley (1968). Journal of Personality and Social Psychology, 10, 215–221. DOI:10.1037/h0026570',
      'Fischer et al. (2011). Psychological Bulletin, 137, 517–537. DOI:10.1037/a0023304'
    ]
  };
});